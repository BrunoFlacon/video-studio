# 🎬 VideoStudio Pro

Plataforma web profissional de edição de vídeo inspirada no CapCut / Premiere / Media Encoder, com foco em:
- edição em timeline
- cortes automáticos
- legendas
- áudio profissional
- render local ou em nuvem
- live streaming
- exportação para editores profissionais

---

## 🚀 Funcionalidades principais

### 🎞️ Edição
- Timeline avançada estilo CapCut
- Trim, split, drag & resize
- Lower thirds animados
- Texto, imagens, logos
- Vinhetas e overlays
- Editor de imagens e capas

### 🔊 Áudio profissional
- Normalização (EBU R128 / loudnorm)
- Limpeza de ruído
- Isolamento de voz
- EQ, compressor, pré-amplificador
- Presets TikTok / Reels / Shorts

### 🧠 IA
- Corte automático por silêncio
- Highlights automáticos
- Geração de Shorts
- Legendas automáticas

### 📡 Live
- Transmissão ao vivo
- Cortes em tempo real
- Legendas ao vivo
- Overlays dinâmicos

### 📤 Exportação
- Batch export (Media Encoder style)
- TikTok / Reels / Shorts
- Premiere Pro (XML)
- DaVinci Resolve (EDL)
- CapCut / ClipChamp

### 📱 Mobile
- PWA instalável
- Offline
- Touch-first
- Preparado para app nativo

---

## 🧱 Arquitetura

- Backend: PHP 8+ (FFmpeg)
- Frontend: HTML5 / CSS3 / JS Vanilla
- Áudio/Vídeo: FFmpeg
- Infra opcional: Docker / Kubernetes
- Cloud render distribuído
- Plugins externos

---

## ⚙️ Instalação rápida

```bash
git clone https://github.com/BrunoFlacon/videostudio-pro.git
cd videostudio-pro
chmod +x setup-phase-*.sh
./setup-phase-1.sh
...
./setup-phase-8.sh
