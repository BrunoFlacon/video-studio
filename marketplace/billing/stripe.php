<?php
if (!getenv('ENABLE_BILLING'))
    exit;

echo json_encode([
    'status' => 'billing enabled',
    'provider' => 'stripe'
]);
