<?php
/**
 * API de Progresso em Tempo Real
 * Lê o arquivo de status gerado pelo FFmpeg e retorna JSON.
 */
header('Content-Type: application/json');
header('Cache-Control: no-cache');

$session_id = $_GET['job_id'] ?? 'default';
$progress_file = dirname(__DIR__) . "/exports/progress_{$session_id}.txt";

if (!file_exists($progress_file)) {
    echo json_encode(['status' => 'waiting', 'percentage' => 0]);
    exit;
}

$content = file_get_contents($progress_file);
$data = [];

// O FFmpeg escreve no formato key=value
$lines = explode("\n", $content);
foreach ($lines as $line) {
    if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line);
        $data[trim($key)] = trim($value);
    }
}

// Calcula o progresso baseado no tempo renderizado vs tempo total esperado.
// O tempo total deve ser enviado pelo cliente via GET ou salvo em algum lugar.
// Se não tivermos o total, retornamos apenas o tempo absoluto processado.
$out_time_ms = intval($data['out_time_us'] ?? 0) / 1000;
$out_time_sec = $out_time_ms / 1000;

echo json_encode([
    'status' => $data['progress'] ?? 'rendering',
    'time' => $out_time_sec,
    'speed' => $data['speed'] ?? '0x',
    'fps' => $data['fps'] ?? 0,
    'bitrate' => $data['bitrate'] ?? '0kbits/s',
    'total_size' => $data['total_size'] ?? 0
]);
