<?php
$input = $_POST['input'];
$preset = $_POST['preset'] ?? 'tiktok';

$presets = [
  'tiktok' => '1080x1920',
  'reels' => '1080x1920',
  'shorts' => '1080x1920',
  'youtube' => '1920x1080'
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
