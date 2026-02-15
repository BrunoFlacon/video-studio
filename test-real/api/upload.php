<?php
// Impede que erros do PHP sejam exibidos como HTML na resposta do cliente
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Captura qualquer saída inesperada (como warnings de permissão)
// Captura qualquer saída inesperada (como warnings de permissão)
ob_start();
session_start(); // Inicia sessão para rastrear uploads

try {
    // Configurações
    $uploadDir = '../uploads/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }

    if (!is_writable($uploadDir)) {
        throw new Exception('Pasta de uploads sem permissão de escrita (Windows/PHP).');
    }

    // Verifica se há arquivo
    if (!isset($_FILES['media']) || $_FILES['media']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['media']['error'] ?? 'desconhecido';
        throw new Exception("Erro no upload: código $errorCode");
    }

    $file = $_FILES['media'];
    $filenameRaw = $file['name'];
    $ext = strtolower(pathinfo($filenameRaw, PATHINFO_EXTENSION));
    $allowedTypes = ['mp4', 'webm', 'mp3', 'wav', 'mov', 'mkv', 'mpeg'];

    // Validação de Segurança (Extensão)
    if (!in_array($ext, $allowedTypes)) {
        if ($file['type'] === 'video/webm')
            $ext = 'webm';
        else if ($file['type'] === 'audio/webm' || $file['type'] === 'audio/mp3' || $file['type'] === 'audio/mpeg')
            $ext = 'mp3';
        else {
            throw new Exception('Tipo de arquivo não permitido: ' . $file['type']);
        }
    }

    // Gera nome único
    $safeFilename = uniqid('upload_') . '.' . $ext;
    $destination = $uploadDir . $safeFilename;

    if (move_uploaded_file($file['tmp_name'], $destination)) {
        ob_end_clean(); // Descarta qualquer lixo/warnings gerados antes
        // Registra na sessão para limpeza automática
        if (!isset($_SESSION['temp_uploads'])) {
            $_SESSION['temp_uploads'] = [];
        }
        $_SESSION['temp_uploads'][] = $destination;

        echo json_encode([
            'status' => 'success',
            'path' => $destination,
            'filename' => $safeFilename
        ]);
    } else {
        throw new Exception('Falha ao mover arquivo para pasta de uploads.');
    }

} catch (Exception $e) {
    ob_end_clean(); // Limpa saídas sujas (HTML de erro PHP)
    http_response_code(500);
    echo json_encode(['status' => 'error', 'error' => $e->getMessage()]);
}
?>