<?php
$plugin = $_POST['plugin'];
copy("uploads/$plugin", "plugins-enabled/$plugin");

echo json_encode([
    'status' => 'activated',
    'plugin' => $plugin
]);
