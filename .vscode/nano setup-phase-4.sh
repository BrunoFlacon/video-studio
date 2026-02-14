#!/bin/bash

echo "🎬 VideoStudio – FASE 4 (Lower Thirds, Áudio Pro, Render, Live)"

# =========================
# CSS LOWER THIRDS / TEXT
# =========================
cat <<'EOF' >> public/assets/css/editor.css

.text-layer {
  position: absolute;
  padding: 8px 12px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 4px;
  cursor: move;
  animation: fadeIn 0.5s ease;
}

.lower-third {
  bottom: 20px;
  left: 20px;
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
EOF

# =========================
# TEXT / LOWER THIRD JS
# =========================
cat <<'EOF' > public/assets/js/core/text.js
export function createText(text, lower = false) {
  const el = document.createElement('div');
  el.className = 'text-layer' + (lower ? ' lower-third' : '');
  el.contentEditable = true;
  el.innerText = text;

  let offsetX, offsetY, dragging = false;

  el.onmousedown = e => {
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  };

  document.onmousemove = e => {
    if (!dragging) return;
    el.style.left = (e.pageX - offsetX) + 'px';
    el.style.top = (e.pageY - offsetY) + 'px';
  };

  document.onmouseup = () => dragging = false;

  document.body.appendChild(el);
}
EOF

# =========================
# AUDIO PRO PRESETS
# =========================
cat <<'EOF' > ffmpeg/audio_presets.txt
loudnorm=I=-16:TP=-1.5:LRA=11,
equalizer=f=1000:t=q:w=1:g=3,
acompressor=threshold=-18dB:ratio=3:attack=5:release=50
EOF

# =========================
# RENDER FINAL API
# =========================
cat <<'EOF' > api/render-final.php
<?php
$input = $_POST['input'];
$preset = $_POST['preset'] ?? 'tiktok';

$presets = [
  'tiktok' => '1080x1920',
  'reels'  => '1080x1920',
  'shorts' => '1080x1920',
  'youtube'=> '1920x1080'
];

$res = $presets[$preset] ?? '1920x1080';
$output = "storage/render_" . time() . ".mp4";

$audio = file_get_contents(__DIR__ . '/../ffmpeg/audio_presets.txt');

$cmd = "ffmpeg -y -i $input -vf scale=$res -af \"$audio\" -c:v libx264 -c:a aac $output";
exec($cmd);

echo json_encode([
  'status' => 'ok',
  'file' => $output,
  'preset' => $preset
]);
EOF

# =========================
# LIVE STREAM API
# =========================
cat <<'EOF' > api/live.php
<?php
$input = $_POST['input'];
$rtmp = $_POST['rtmp'];

$cmd = "ffmpeg -re -i $input -c:v libx264 -c:a aac -f flv $rtmp";
exec($cmd);

echo json_encode(['status' => 'live started']);
EOF

# =========================
# LIVE CAPTIONS (BASE)
# =========================
cat <<'EOF' > api/live-captions.php
<?php
echo json_encode([
  'status' => 'captions ready',
  'lang' => 'pt-BR'
]);
EOF

# =========================
# DOCS
# =========================
cat <<'EOF' > docs/phase-4.md
# FASE 4

## Visual
- Lower thirds animados
- Textos editáveis
- Legendas base

## Áudio
- Loudnorm
- EQ
- Compressor

## Render
- TikTok / Reels / Shorts / YouTube

## Live
- RTMP
- Captions base
EOF

# =========================
# GIT COMMIT
# =========================
git add .
git commit -m "feat(pro): lower thirds animations, audio pro, render presets, live streaming (phase 4)"

echo "✅ FASE 4 concluída com sucesso"
