<?php
if (!getenv('ENABLE_LIMITS'))
  return;

$max = 600;
if ($_POST['duration'] > $max) {
  http_response_code(403);
  exit('Render limit exceeded');
}
