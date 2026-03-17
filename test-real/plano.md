Plano Mestre de Integração: Este documento detalha a arquitetura para integrar autenticação OAuth 2.0 (Google, Microsoft, Dropbox), autenticação de dois fatores (2FA) e gerenciamento de arquivos em nuvem ao dashboard existente em PHP 8.5 e Javascript Vanilla.1. Arquitetura do Banco de Dados (MySQL)Precisamos alterar sua estrutura atual para suportar "Múltiplas Identidades" para um único usuário e persistência de tokens para uploads em background.SQL Schema-- 1. Tabela Principal de Usuários (Agnóstica)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE, -- Identificador público seguro
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL, -- Null se o usuário se cadastrar apenas via Social
    full_name VARCHAR(255),
    avatar_url TEXT,
    
    -- Configurações de Segurança
    two_factor_enabled TINYINT(1) DEFAULT 0,
    two_factor_secret VARCHAR(255) NULL, -- Segredo TOTP (Google Auth)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabela de Conexões OAuth (As Chaves do Reino)
-- Armazena tokens de Google, Dropbox, OneDrive vinculados ao User ID
CREATE TABLE linked_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider ENUM('google', 'dropbox', 'onedrive', 'microsoft') NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL, -- ID único retornado pela API (ex: 'sub' do Google)
    provider_email VARCHAR(255),
    
    -- Tokens (IMPORTANTE: Criptografar em produção via OpenSSL)
    access_token TEXT NOT NULL,
    refresh_token TEXT, -- Vital para renovar acesso sem o usuário logar de novo
    token_expires_at INT, -- Timestamp Unix
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider (provider, provider_user_id)
);

-- 3. Tabela de Arquivos do Projeto (Assets)
CREATE TABLE project_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    project_id INT NULL, -- Se vinculado a um projeto específico do Antigravity
    
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Origem do Arquivo
    source_provider ENUM('local', 'google', 'dropbox', 'onedrive') DEFAULT 'local',
    cloud_file_id VARCHAR(255), -- ID do arquivo na nuvem
    cloud_download_link TEXT,   -- Link temporário ou fixo
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
2. Estrutura de Pastas e ArquivosOrganize o backend para separar a lógica de conexão da lógica do dashboard./antigravity
├── /config
│   ├── database.php        # Conexão PDO
│   └── keys.php            # Credenciais (Client IDs, Secrets) - NÃO COMITAR NO GIT
├── /core
│   ├── Auth.php            # Gerencia Sessão, Login, Hash de Senha
│   ├── TwoFactor.php       # Gerencia Geração/Validação de TOTP
│   └── CloudManager.php    # "Factory" que escolhe qual nuvem usar
├── /integrations
│   ├── GoogleClient.php    # Lógica específica do GDrive
│   ├── DropboxClient.php   # Lógica específica do Dropbox
│   └── OneDriveClient.php  # Lógica específica do OneDrive
├── /public
│   ├── /assets
│   │   └── /js
│   │       └── dashboard.js # Seu Vanilla JS
│   ├── callback.php        # Ponto de retorno ÚNICO para todos OAuths
│   ├── login.php
│   └── index.php           # Dashboard Antigravity
└── /api
    ├── auth_status.php     # Endpoint JSON para verificar sessão/2FA
    ├── list_files.php      # Lista arquivos da nuvem
    └── upload_target.php   # Recebe upload e envia para nuvem
3. Fluxo de Autenticação (Passo a Passo)Este é o fluxo lógico que você deve programar no callback.php e Auth.php.Cenário A: Usuário Novo (Cadastro via Google/Microsoft)Usuário clica em "Entrar com Google".Redireciona para Google OAuth.Retorna para callback.php com um code.Backend: Troca code por access_token e dados do perfil (email, nome).Backend: Consulta tabela users:Email existe? -> Vá para Cenário B.Email não existe? -> INSERT na tabela users (cria conta) E INSERT na linked_accounts.Sessão: Define $_SESSION['user_id'].Redirecionamento: Envia para Dashboard.Cenário B: Usuário Existente (Login ou Vinculação)Sistema detecta que o email retornado pelo Google já está na tabela users.Backend: Verifica tabela linked_accounts.Se já existe vínculo: Atualiza o access_token e refresh_token.Se não existe: Cria novo registro em linked_accounts (vincula Google à conta existente).Verificação 2FA (Crítico):O sistema verifica users.two_factor_enabled.Se 1 (Ativado): Não define $_SESSION['logged_in'] = true ainda.Define $_SESSION['2fa_pending'] = true.Redireciona para tela de "Digite o Código 2FA".Se 0 (Desativado): Define $_SESSION['logged_in'] = true e entra.4. Implementação Técnica (Resumo do Código)A. Configuração Unificada (keys.php)<?php
return [
    'google' => [
        'client_id' => 'SEU_ID',
        'client_secret' => 'SEU_SECRET',
        'redirect_uri' => '[https://seuapp.com/callback.php?provider=google](https://seuapp.com/callback.php?provider=google)'
    ],
    'dropbox' => [
        // ...
    ]
];
B. O Controlador de Callback (callback.php)<?php
session_start();
require '../config/database.php';
require '../integrations/GoogleClient.php';
// ... requires ...

$provider = $_GET['provider'] ?? '';
$code = $_GET['code'] ?? '';

// 1. Obter Token e Dados do Usuário da Nuvem
if ($provider === 'google') {
    $client = new GoogleClient();
    $data = $client->authenticate($code); // Retorna [email, nome, tokens...]
}

// 2. Lógica de Banco de Dados (Pseudocódigo)
$user = $db->query("SELECT * FROM users WHERE email = ?", [$data['email']])->fetch();

if (!$user) {
    // Cadastrar Novo Usuário Automaticamente
    $db->query("INSERT INTO users (email, full_name, ...) VALUES ...", ...);
    $userId = $db->lastInsertId();
} else {
    $userId = $user['id'];
}

// 3. Salvar/Atualizar Tokens da Nuvem
$db->query("INSERT INTO linked_accounts (user_id, provider, access_token...) VALUES ... ON DUPLICATE KEY UPDATE access_token = ...");

// 4. Verificação 2FA
if ($user && $user['two_factor_enabled']) {
    $_SESSION['pre_2fa_user_id'] = $userId;
    header("Location: /login/verify-2fa.php"); // Tela de input do código
    exit;
}

// 5. Login Final
$_SESSION['user_id'] = $userId;
header("Location: /dashboard");
5. Integração com o Dashboard (Javascript Vanilla)No seu arquivo dashboard.js, você criará um gerenciador de arquivos que se comunica com essas APIs.Estrutura do Modal de ImportaçãoQuando o usuário clicar em "Importar Mídia" no seu editor:Frontend: Abre modal.Frontend: Faz fetch em api/list_files.php?provider=google.Backend: - Verifica se o token do Google no banco expirou.Se expirou, usa o refresh_token para pegar um novo (transparente para o usuário).Chama API do Drive e retorna lista JSON.Frontend: Renderiza lista. O usuário clica em um arquivo de vídeo.Ação: O sistema não baixa o arquivo imediatamente. Ele salva a referência (cloud_file_id) no banco project_assets.Edição de Vídeo (O Pulo do Gato)Para editar um arquivo que está na nuvem sem travar o navegador:Use Range Requests.No PHP (proxy_video.php), quando o editor pedir o vídeo, você abre um stream com a API do Google Drive/Dropbox.Você repassa os chunks de dados para o HTML5 Video Player ou Canvas do seu editor à medida que eles chegam.6. Próximos Passos ImediatosCrie as tabelas MySQL listadas acima no seu banco de dados local.Gere as credenciais no Google Cloud Console e Azure Portal.Implemente o callback.php básico apenas para testar se você consegue receber o access_token e salvar no banco.