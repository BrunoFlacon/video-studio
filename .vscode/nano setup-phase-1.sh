#!/bin/bash

echo "🚀 Gerando VideoStudio – FASE 1"

# Pastas
mkdir -p public/assets/js/core
mkdir -p public/assets/css
mkdir -p api
mkdir -p docs
mkdir -p storage

# .gitignore
cat <<EOF > .gitignore
storage/*
!storage/.gitkeep
.env
*.log
EOF

touch storage/.gitkeep

# README.md
cat <<'EOF' > README.md
# 🎬 VideoStudio Web Engine

Motor web profissional para edição, renderização e transmissão de vídeos.

## Stack
- HTML5 / CSS5
- JavaScript Vanilla (ES Modules)
- PHP 8+
- FFmpeg

## Status
FASE 1 – Core Editor
EOF

# index.php
cat <<'EOF' > public/index.php
<?php
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:;");
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>VideoStudio</title>
<link rel="stylesheet" href="assets/css/editor.css">
</head>
<body>

<header class="topbar">🎬 VideoStudio</header>

<main id="editor">
  <section id="preview">
    <video id="videoPreview" controls></video>
  </section>
  <section id="timeline">
    <div id="tracks">Timeline pronta (FASE 1)</div>
  </section>
</main>

<script type="module" src="assets/js/main.js"></script>
</body>
</html>
EOF

# CSS
cat <<'EOF' > public/assets/css/editor.css
body {
  margin: 0;
  background: #111;
  color: #fff;
  font-family: system-ui;
}
.topbar {
  height: 48px;
  background: #000;
  display: flex;
  align-items: center;
  padding: 0 16px;
}
#editor {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
}
#preview {
  flex: 2;
  background: #000;
}
#timeline {
  flex: 1;
  background: #1c1c1c;
}
EOF

# main.js
cat <<'EOF' > public/assets/js/main.js
import { App } from './core/app.js';
document.addEventListener('DOMContentLoaded', () => App.init());
EOF

# app.js
cat <<'EOF' > public/assets/js/core/app.js
import { State } from './state.js';

export const App = {
  init() {
    console.log("VideoStudio iniciado");
    this.bindUpload();
  },

  bindUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.hidden = true;

    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const video = document.getElementById('videoPreview');
      video.src = URL.createObjectURL(file);
      State.video = file;
    });

    document.body.appendChild(input);
    document.getElementById('preview').onclick = () => input.click();
  }
};
EOF

# state.js
cat <<'EOF' > public/assets/js/core/state.js
export const State = {
  video: null
};
EOF

# API render.php
cat <<'EOF' > api/render.php
<?php
header('Content-Type: application/json');
echo json_encode(['status' => 'render api ready']);
EOF

# Docs
cat <<'EOF' > docs/phase-1.md
# FASE 1
Editor base, preview e estrutura inicial.
EOF

# Git
git init
git add .
git commit -m "feat(core): initial editor setup (phase 1)"

echo "✅ FASE 1 concluída com sucesso"
