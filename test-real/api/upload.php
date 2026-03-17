<?php
// Impede que erros do PHP sejam exibidos como HTML na resposta do cliente
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Aumenta limites de tempo e memória para uploads grandes
set_time_limit(300);
ini_set('memory_limit', '256M');

header('Content-Type: application/json; charset=utf-8');

// Captura qualquer saída inesperada (como warnings de permissão)
ob_start();

try {
    session_start(); // Inicia sessão para rastrear uploads

    // Define diretório de destino usando caminho absoluto
    $uploadDir = __DIR__ . '/../uploads/';

    // Verifica e cria diretório se não existir
    if (!is_dir($uploadDir)) {
        if (!@mkdir($uploadDir, 0777, true)) {
            $error = error_get_last();
            throw new Exception('Falha ao criar diretório de uploads: ' . ($error['message'] ?? 'sem permissão'));
        }
    }

    // Verifica permissão de escrita
    if (!is_writable($uploadDir)) {
        throw new Exception('Pasta de uploads sem permissão de escrita (Windows/PHP check).');
    }

    // Verifica se o POST excedeu o limite do PHP (post_max_size)
    if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > 0) {
        $maxPost = ini_get('post_max_size');
        throw new Exception("Arquivo excede o limite de post_max_size do servidor ($maxPost).");
    }

    // Verifica se há arquivo enviado
    if (!isset($_FILES['media'])) {
        throw new Exception("Nenhum arquivo recebido (campo 'media' ausente).");
    }

    if ($_FILES['media']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['media']['error'];
        $msg = 'Erro desconhecido';
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
                $msg = 'Arquivo excede upload_max_filesize no php.ini';
                break;
            case UPLOAD_ERR_FORM_SIZE:
                $msg = 'Arquivo excede MAX_FILE_SIZE do formulário';
                break;
            case UPLOAD_ERR_PARTIAL:
                $msg = 'Upload interrompido (parcial)';
                break;
            case UPLOAD_ERR_NO_FILE:
                $msg = 'Nenhum arquivo enviado';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $msg = 'Pasta temporária ausente';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $msg = 'Falha ao escrever no disco';
                break;
            case UPLOAD_ERR_EXTENSION:
                $msg = 'Upload interrompido por extensão PHP';
                break;
        }
        throw new Exception("Erro no upload ($errorCode): $msg");
    }

    $file = $_FILES['media'];
    $filenameRaw = $file['name'];
    $ext = strtolower(pathinfo($filenameRaw, PATHINFO_EXTENSION));

    // Lista estrita de tipos permitidos
    $allowedTypes = ['mp4', 'webm', 'mp3', 'wav', 'mov', 'mkv', 'mpeg', 'jpg', 'png', 'jpeg', 'gif'];

    // Validação de tipo MIME simples como fallback
    $mime = $file['type'] ?? '';

    // Mapa de correção de extensões baseada no MIME (opcional)
    if ($mime === 'video/webm' && $ext !== 'webm')
        $ext = 'webm';
    if (($mime === 'audio/webm' || $mime === 'audio/mp3') && $ext !== 'mp3')
        $ext = 'mp3';

    if (!in_array($ext, $allowedTypes)) {
        throw new Exception("Tipo de arquivo não permitido: .$ext ($mime)");
    }

    // Gera nome único seguro
    $safeFilename = uniqid('upload_') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $destination = $uploadDir . $safeFilename;

    if (move_uploaded_file($file['tmp_name'], $destination)) {
        ob_end_clean(); // Descarta warnings anteriores

        // Registra na sessão para limpeza automática futura
        if (!isset($_SESSION['temp_uploads'])) {
            $_SESSION['temp_uploads'] = [];
        }
        $_SESSION['temp_uploads'][] = $destination;

        // URL relativa para acesso via web
        // Assume que 'api/' e 'uploads/' são irmãos na raiz
        $webPath = 'uploads/' . $safeFilename;

        echo json_encode([
            'status' => 'success',
            'path' => $webPath,
            'filename' => $safeFilename,
            'full_path' => realpath($destination) // Debug info (opcional)
        ]);
    } else {
        $error = error_get_last();
        throw new Exception('Falha ao mover arquivo: ' . ($error['message'] ?? 'erro de permissão ou bloqueio'));
    }

} catch (Exception $e) {
    ob_end_clean(); // Limpa saídas sujas (HTML de erro PHP)

    // Log do erro para debug servidor
    error_log("[Upload Error] " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>