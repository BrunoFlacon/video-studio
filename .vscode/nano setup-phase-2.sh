#!/bin/bash

echo "🎬 VideoStudio – FASE 2 (Timeline avançada)"

# =========================
# CSS TIMELINE
# =========================
cat <<'EOF' >> public/assets/css/editor.css

/* === TIMELINE AVANÇADA === */
#timeline {
  position: relative;
  padding: 10px;
  overflow-x: auto;
}

.track {
  position: relative;
  height: 60px;
  background: #2a2a2a;
  border-radius: 6px;
  margin-bottom: 10px;
}

.clip {
  position: absolute;
  top: 10px;
  height: 40px;
  background: linear-gradient(135deg, #00c6ff, #0072ff);
  border-radius: 4px;
  cursor: pointer;
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: red;
  pointer-events: none;
}
EOF

# =========================
# HTML TIMELINE
# =========================
sed -i "/<section id=\"timeline\">/c\<section id=\"timeline\"><div class=\"track\" id=\"track-video\"></div><div class=\"playhead\" id=\"playhead\"></div></section>" public/index.php

# =========================
# TIMELINE JS
# =========================
cat <<'EOF' > public/assets/js/core/timeline.js
import { State } from './state.js';

export const Timeline = {
  track: null,
  playhead: null,

  init() {
    this.track = document.getElementById('track-video');
    this.playhead = document.getElementById('playhead');

    this.track.addEventListener('click', e => {
      const rect = this.track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this.movePlayhead(x);
    });
  },

  addClip(duration = 10) {
    const clip = document.createElement('div');
    clip.className = 'clip';
    clip.style.left = '0px';
    clip.style.width = duration * 20 + 'px';

    clip.addEventListener('dblclick', () => this.splitClip(clip));
    this.track.appendChild(clip);
  },

  movePlayhead(x) {
    this.playhead.style.left = x + 'px';
  },

  splitClip(clip) {
    const width = clip.offsetWidth;
    const half = width / 2;

    clip.style.width = half + 'px';

    const newClip = document.createElement('div');
    newClip.className = 'clip';
    newClip.style.left = clip.offsetLeft + half + 'px';
    newClip.style.width = half + 'px';

    this.track.appendChild(newClip);
  }
};
EOF

# =========================
# ATUALIZAR APP.JS
# =========================
cat <<'EOF' > public/assets/js/core/app.js
import { State } from './state.js';
import { Timeline } from './timeline.js';

export const App = {
  init() {
    console.log("VideoStudio iniciado (FASE 2)");
    Timeline.init();
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

      Timeline.addClip(15);
    });

    document.body.appendChild(input);
    document.getElementById('preview').onclick = () => input.click();
  }
};
EOF

# =========================
# DOCS
# =========================
cat <<'EOF' > docs/phase-2.md
# FASE 2 – Timeline Avançada

- Timeline estilo CapCut
- Playhead clicável
- Clips visuais
- Split por duplo clique
EOF

# =========================
# GIT COMMIT
# =========================
git add .
git commit -m "feat(timeline): advanced timeline with playhead and split (phase 2)"

echo "✅ FASE 2 aplicada com sucesso"
