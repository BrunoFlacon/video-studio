<?php
$file = $_FILES['plugin'];
$dest = "uploads/" . basename($file['name']);
move_uploaded_file($file['tmp_name'], $dest);

echo json_encode([
    'status' => 'uploaded',
    'file' => $dest
]);
