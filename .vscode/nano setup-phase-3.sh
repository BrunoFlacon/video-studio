#!/bin/bash

echo "🎬 VideoStudio – FASE 3 (Drag, Resize, Áudio, FFmpeg)"

# =========================
# CSS CLIPS EDITÁVEIS
# =========================
cat <<'EOF' >> public/assets/css/editor.css

.clip {
  display: flex;
  align-items: center;
}

.clip .handle {
  width: 6px;
  height: 100%;
  background: rgba(255,255,255,0.6);
  cursor: ew-resize;
}

.clip .delete {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4444;
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 12px;
  text-align: center;
  line-height: 18px;
  cursor: pointer;
}
EOF

# =========================
# ÁUDIO TRACK
# =========================
sed -i "/<div class=\"track\" id=\"track-video\">/a\<div class=\"track\" id=\"track-audio\"></div>" public/index.php

# =========================
# WAVEFORM JS
# =========================
cat <<'EOF' > public/assets/js/core/waveform.js
export const Waveform = {
  draw(canvas, audioBuffer) {
    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.fillStyle = '#00ffcc';
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
  }
};
EOF

# =========================
# TIMELINE DRAG / RESIZE
# =========================
cat <<'EOF' > public/assets/js/core/clip.js
export function makeEditable(clip) {
  let isDragging = false;
  let startX = 0;

  clip.addEventListener('mousedown', e => {
    if (e.target.classList.contains('handle')) return;
    isDragging = true;
    startX = e.clientX - clip.offsetLeft;
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    clip.style.left = (e.clientX - startX) + 'px';
  });

  document.addEventListener('mouseup', () => isDragging = false);

  const handleLeft = document.createElement('div');
  handleLeft.className = 'handle';
  clip.appendChild(handleLeft);

  handleLeft.addEventListener('mousedown', e => {
    e.stopPropagation();
    const start = e.clientX;
    const startWidth = clip.offsetWidth;

    const resize = e2 => {
      clip.style.width = (startWidth - (e2.clientX - start)) + 'px';
    };

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', resize);
    }, { once: true });
  });

  const del = document.createElement('div');
  del.className = 'delete';
  del.innerText = '×';
  del.onclick = () => clip.remove();
  clip.appendChild(del);
}
EOF

# =========================
# ATUALIZAR TIMELINE
# =========================
cat <<'EOF' > public/assets/js/core/timeline.js
import { makeEditable } from './clip.js';

export const Timeline = {
  init() {
    this.videoTrack = document.getElementById('track-video');
    this.audioTrack = document.getElementById('track-audio');
  },

  addClip(track, duration = 10) {
    const clip = document.createElement('div');
    clip.className = 'clip';
    clip.style.left = '0px';
    clip.style.width = duration * 20 + 'px';

    makeEditable(clip);
    track.appendChild(clip);
  }
};
EOF

# =========================
# APP.JS UPDATE
# =========================
cat <<'EOF' > public/assets/js/core/app.js
import { Timeline } from './timeline.js';

export const App = {
  init() {
    Timeline.init();
    this.bindUpload();
  },

  bindUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,audio/*';
    input.hidden = true;

    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const url = URL.createObjectURL(file);

      if (file.type.startsWith('video')) {
        document.getElementById('videoPreview').src = url;
        Timeline.addClip(Timeline.videoTrack, 15);
      } else {
        Timeline.addClip(Timeline.audioTrack, 15);
      }
    };

    document.body.appendChild(input);
    document.getElementById('preview').onclick = () => input.click();
  }
};
EOF

# =========================
# FFmpeg REAL CUT API
# =========================
cat <<'EOF' > api/cut.php
<?php
$input = $_POST['input'];
$start = $_POST['start'];
$duration = $_POST['duration'];
$output = "storage/cut_" . time() . ".mp4";

$cmd = "ffmpeg -y -i $input -ss $start -t $duration -c copy $output";
exec($cmd);

echo json_encode([
  'status' => 'ok',
  'file' => $output
]);
EOF

# =========================
# DOCS
# =========================
cat <<'EOF' > docs/phase-3.md
# FASE 3

- Drag & drop
- Resize trim
- Delete clip
- Áudio track
- Waveform base
- FFmpeg cortes reais
EOF

# =========================
# GIT
# =========================
git add .
git commit -m "feat(editor): drag resize delete clips + audio track + ffmpeg cuts (phase 3)"

echo "✅ FASE 3 concluída"