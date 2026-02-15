<?php
// api/cleanup_session.php
// Called via Navigator.sendBeacon() when the user closes the tab or reloads.
declare(strict_types=1);

session_start();

// Enable error reporting for debugging logs (but hidden from output)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log function (optional, for debugging)
function log_cleanup($msg)
{
    // file_put_contents(__DIR__ . '/cleanup.log', date('[Y-m-d H:i:s] ') . $msg . PHP_EOL, FILE_APPEND);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_SESSION['temp_uploads']) && is_array($_SESSION['temp_uploads'])) {
        $count = 0;
        foreach ($_SESSION['temp_uploads'] as $file) {
            // Security check: Ensure file is within uploads directory
            $realPath = realpath($file);
            $uploadsDir = realpath(__DIR__ . '/../uploads/');

            if ($realPath && $uploadsDir && strpos($realPath, $uploadsDir) === 0) {
                if (file_exists($realPath)) {
                    if (unlink($realPath)) {
                        $count++;
                    }
                }
            }
        }
        log_cleanup("Cleaned up $count files from session " . session_id());

        // Clear the session array
        $_SESSION['temp_uploads'] = [];
    }
}

// Return minimal response (Beacon ignores response anyway)
http_response_code(200);
echo "ok";
?>