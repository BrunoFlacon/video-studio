
---

# 🗺️ 2️⃣ ROADMAP SaaS MONETIZÁVEL

> **Arquivo:** `docs/roadmap.md`

### 🟢 Fase atual (Core)
✔ Editor completo  
✔ IA básica  
✔ Export profissional  
✔ Live  

### 🟡 Fase SaaS
- Planos Free / Pro / Enterprise
- Limites por render
- Cloud render escalável
- Marketplace pago
- Assinaturas (Stripe)

### 🔵 Fase Enterprise
- Multi-tenant avançado
- SSO
- White-label
- API pública
- SLA

💡 **Importante:**  
Você **não precisa ativar nada disso agora**. Tudo já está preparado por feature flags.

---

# 🔐 3️⃣ HARDENING DE SEGURANÇA + LGPD

## 🔒 Hardening técnico
- CSP estrito
- Uploads validados
- Execução FFmpeg isolada
- Rate limit
- Tokens expiram
- Logs separados

## 🇧🇷 LGPD (Brasil)
- Consentimento explícito
- Dados mínimos
- Exclusão sob demanda
- Logs anonimizados
- Exportação de dados do usuário

👉 **Recomendação futura:**  
Criar `privacy.php` e `terms.php` públicos.

---

# 🎨 4️⃣ UI FINAL – CAPCUT-LIKE (POLIMENTO)

## Diretrizes visuais
- Dark mode default
- Timeline em blocos
- Playhead central
- Drag & drop fluido
- Mobile-first
- Animações leves (CSS)

## Componentes finais
- Timeline com zoom
- Waveform real
- Keyframes
- Painel de presets
- Marketplace integrado
- Editor de texto com sombra / stroke

📱 **Mobile**
- Timeline horizontal
- Gestos (pinch / drag)
- Botões grandes
- Offline-first

---

# 📘 5️⃣ MANUAL DE INSTALAÇÃO E USO (SITE + APP)

> **Arquivo:** `docs/manual.md`

## Requisitos mínimos
- Linux / Mac / Windows (WSL)
- PHP 8+
- FFmpeg
- Git
- Navegador moderno

## Instalação local
```bash
git clone ...
php -S localhost:8000 -t public
