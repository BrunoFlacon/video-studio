<?php
$queueFile = __DIR__ . '/../cloud/queue.json';
if (!file_exists($queueFile))
  exit;

$queue = json_decode(file_get_contents($queueFile), true);

foreach ($queue as &$job) {
  if ($job['status'] !== 'queued')
    continue;

  $job['status'] = 'processing';
  $out = "storage/cloud_" . time() . ".mp4";

  exec("ffmpeg -i {$job['input']} -vf scale=1080:1920 -c:v libx264 -c:a aac $out");

  $job['status'] = 'done';
  $job['output'] = $out;
}

file_put_contents($queueFile, json_encode($queue));
