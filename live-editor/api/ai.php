<?php
// API Centralizada de Inteligência Artificial para Automação de Vídeo
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Recebe a ação (autocut, highlights, shorts)
$action = $_GET['action'] ?? '';
$input = $_POST['input'] ?? '';

// Verifica se o arquivo de entrada foi fornecido
if (empty($input)) {
    echo json_encode(['error' => 'Arquivo de entrada (input) nao fornecido.']);
    exit;
}

// Definição dos nomes de saída
$timestamp = time();

switch ($action) {
    case 'autocut':
        // Ação: Corte Automático por Silêncio
        // Utiliza o filtro silenceremove do FFmpeg para remover partes mudas
        $out = "storage/autocut_{$timestamp}.mp4";
        // Comando: 1 período de silêncio, limiar de -45dB
        $cmd = "ffmpeg -i $input -af silenceremove=start_periods=1:start_threshold=-45dB:stop_threshold=-45dB $out";
        exec($cmd);
        echo json_encode(['status' => 'sucesso', 'mensagem' => 'Corte automatico concluido', 'arquivo' => $out]);
        break;

    case 'highlights':
        // Ação: Gerar Melhores Momentos (Highlights)
        // Seleciona cenas com mudança brusca (gt(scene,0.4))
        $out = "storage/highlight_{$timestamp}.mp4";
        $cmd = "ffmpeg -i $input -vf select='gt(scene,0.4)',setpts=N/FRAME_RATE/TB $out";
        exec($cmd);
        echo json_encode(['status' => 'sucesso', 'mensagem' => 'Highlights gerados', 'arquivo' => $out]);
        break;

    case 'shorts':
        // Ação: Converter para YouTube Shorts (Vertical)
        // Redimensiona para 1080x1920 (9:16) e corta 60 segundos
        $out = "storage/short_{$timestamp}.mp4";
        $cmd = "ffmpeg -i $input -vf scale=1080:1920 -t 60 -c:v libx264 -c:a aac $out";
        exec($cmd);
        echo json_encode(['status' => 'sucesso', 'mensagem' => 'Shorts vertical gerado', 'arquivo' => $out]);
        break;

    default:
        // Ação inválida
        echo json_encode(['error' => 'Acao de IA desconhecida ou invalida.']);
        break;
}
?>