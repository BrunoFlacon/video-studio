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
