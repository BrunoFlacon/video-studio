<?php
function generate_jwt($user)
{
  $payload = [
    'sub' => $user['id'],
    'exp' => time() + 3600
  ];
  return base64_encode(json_encode($payload));
}
