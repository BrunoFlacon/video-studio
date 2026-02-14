<?php
$ip = $_SERVER['REMOTE_ADDR'];
$file = sys_get_temp_dir() . "/rate_$ip";

$count = file_exists($file) ? intval(file_get_contents($file)) : 0;
if ($count > 100) {
  http_response_code(429);
  exit('Rate limit exceeded');
}
file_put_contents($file, $count + 1);
