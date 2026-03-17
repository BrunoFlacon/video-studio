<?php
// Script de Diagnóstico de Upload
header('Content-Type: application/json');

$response = [
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'memory_limit' => ini_get('memory_limit'),
    'file_uploads' => ini_get('file_uploads'),
    'upload_tmp_dir' => ini_get('upload_tmp_dir') ?: sys_get_temp_dir(),
    'max_execution_time' => ini_get('max_execution_time'),
    'post_data_size' => $_SERVER['CONTENT_LENGTH'] ?? 0,
    'uploads_dir_exists' => is_dir(__DIR__ . '/../uploads/'),
    'uploads_dir_writable' => is_writable(__DIR__ . '/../uploads/'),
    'php_version' => phpversion()
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>