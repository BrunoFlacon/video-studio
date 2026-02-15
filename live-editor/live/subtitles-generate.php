<?php
$input = $_POST['input'];
$lang = $_POST['lang'] ?? 'pt';

$out = "subtitles/" . pathinfo($input, PATHINFO_FILENAME) . ".srt";

$cmd = "whisper $input --language $lang --output_format srt --output_dir subtitles";
exec($cmd);

echo json_encode([
  'status' => 'ok',
  'file' => $out
]);
