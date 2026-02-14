<?php
$jobs = json_decode($_POST['jobs'], true);
$results = [];

foreach ($jobs as $job) {
  $out = "storage/export_" . uniqid() . ".mp4";
  $cmd = "ffmpeg -y -i {$job['input']} -vf scale={$job['resolution']} -c:v libx264 -c:a aac $out";
  exec($cmd);
  $results[] = $out;
}

echo json_encode([
  'status' => 'done',
  'files' => $results
]);
