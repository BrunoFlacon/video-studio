#!/bin/bash

echo "🎬 VideoStudio – FASE 7 (PWA, Cloud Render, IA)"

mkdir -p public pwa cloud worker ai docs

# =========================
# PWA MANIFEST
# =========================
cat <<'EOF' > public/manifest.json
{
  "name": "VideoStudio Pro",
  "short_name": "VideoStudio",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
EOF

# =========================
# SERVICE WORKER (OFFLINE)
# =========================
cat <<'EOF' > public/sw.js
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('videostudio-v1').then(cache =>
      cache.addAll([
        '/',
        '/index.html',
        '/assets/css/editor.css',
        '/assets/js/core/timeline.js'
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
EOF

# =========================
# CLOUD RENDER QUEUE
# =========================
cat <<'EOF' > cloud/queue.php
<?php
$file = 'cloud/queue.json';
$queue = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

$queue[] = [
  'id' => uniqid(),
  'input' => $_POST['input'],
  'preset' => $_POST['preset'],
  'status' => 'queued'
];

file_put_contents($file, json_encode($queue));
echo json_encode(['status' => 'queued']);
EOF

# =========================
# CLOUD WORKER
# =========================
cat <<'EOF' > worker/render-worker.php
<?php
$queueFile = __DIR__ . '/../cloud/queue.json';
if (!file_exists($queueFile)) exit;

$queue = json_decode(file_get_contents($queueFile), true);

foreach ($queue as &$job) {
  if ($job['status'] !== 'queued') continue;

  $job['status'] = 'processing';
  $out = "storage/cloud_" . time() . ".mp4";

  exec("ffmpeg -i {$job['input']} -vf scale=1080:1920 -c:v libx264 -c:a aac $out");

  $job['status'] = 'done';
  $job['output'] = $out;
}

file_put_contents($queueFile, json_encode($queue));
EOF

# =========================
# IA – CORTE POR SILÊNCIO
# =========================
cat <<'EOF' > ai/auto-cut.php
<?php
$input = $_POST['input'];
$out = "storage/autocut_" . time() . ".mp4";

$cmd = "ffmpeg -i $input -af silenceremove=start_periods=1:start_threshold=-45dB:stop_threshold=-45dB $out";
exec($cmd);

echo json_encode(['status' => 'ok', 'file' => $out]);
EOF

# =========================
# IA – HIGHLIGHTS
# =========================
cat <<'EOF' > ai/highlights.php
<?php
$input = $_POST['input'];
$out = "storage/highlight_" . time() . ".mp4";

exec("ffmpeg -i $input -vf select='gt(scene,0.4)',setpts=N/FRAME_RATE/TB $out");

echo json_encode(['status' => 'ok', 'file' => $out]);
EOF

# =========================
# IA – SHORTS
# =========================
cat <<'EOF' > ai/shorts.php
<?php
$input = $_POST['input'];
$out = "storage/short_" . time() . ".mp4";

exec("ffmpeg -i $input -vf scale=1080:1920 -t 60 -c:v libx264 -c:a aac $out");

echo json_encode(['status' => 'ok', 'file' => $out]);
EOF

# =========================
# DOCS
# =========================
cat <<'EOF' > docs/phase-7.md
# FASE 7

## PWA
- Instalável
- Offline
- Mobile-first

## Cloud Render
- Fila distribuída
- Workers independentes

## IA
- Auto cut por silêncio
- Highlights
- Shorts automáticos
EOF

# =========================
# COMMIT
# =========================
git add .
git commit -m "feat(phase7): PWA offline, cloud render queue, AI auto cuts, highlights, shorts"

echo "✅ FASE 7 concluída com sucesso"
