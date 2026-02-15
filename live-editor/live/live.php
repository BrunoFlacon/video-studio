<?php
$input = $_POST['input'];
$rtmp = $_POST['rtmp'];

$cmd = "ffmpeg -re -i $input -c:v libx264 -c:a aac -f flv $rtmp";
exec($cmd);

echo json_encode(['status' => 'live started']);
