<?php
/**
 * API de Exportação Profissional V2 (FFmpeg com Aceleração por Hardware)
 * Processa a timeline e renderiza o arquivo final em alta qualidade.
 */
header('Content-Type: application/json');

// 1. Configurações de Diretórios
$rootDir = dirname(__DIR__) . "/";
$assetsDir = $rootDir . "assets/";
$outputDir = $rootDir . "exports/";
$uploadsDir = $rootDir . "uploads/";

if (!is_dir($outputDir))
    @mkdir($outputDir, 0777, true);
if (!is_dir($uploadsDir))
    @mkdir($uploadsDir, 0777, true);

// 2. Recebe Input
$input = json_decode(file_get_contents("php://input"), true);

// GARBAGE COLLECTION (30 Minutos)
// Remove arquivos de exportação antigos para não lotar o disco
try {
    if (is_dir($outputDir)) {
        $files = glob($outputDir . '*');
        $now = time();
        foreach ($files as $file) {
            if (is_file($file)) {
                if ($now - filemtime($file) >= 1800) { // 30 min = 1800s
                    @unlink($file);
                }
            }
        }
    }
} catch (Exception $e) {
    // Silêncio é ouro na limpeza
}

if (!$input || !isset($input['clips'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Dados inválidos ou timeline vazia.']);
    exit;
}

// 3. Configurações
$settings = $input['settings'] ?? [];
$width = intval($settings['width'] ?? 1920);
$height = intval($settings['height'] ?? 1080);
$fps = floatval($settings['fps'] ?? 30);
$audioRate = intval($settings['sampleRate'] ?? 44100);
$quality = $settings['quality'] ?? 'high'; // Default high

// 4. Mapeamento de Clips e Resolução de Caminhos
$clips = $input['clips'] ?? [];
$validClips = [];

foreach ($clips as $clip) {
    if (!isset($clip['src']))
        continue;
    if (strpos($clip['src'], 'blob:') === 0 && !isset($clip['serverSrc']))
        continue;

    $sourceToUse = $clip['serverSrc'] ?? $clip['src'];
    $fileName = basename($sourceToUse);
    $resolvedPath = "";

    // Ordem de busca: 1. Caminho direto se existir, 2. Pasta uploads, 3. pasta assets
    $checks = [
        $sourceToUse,
        $uploadsDir . $fileName,
        realpath($uploadsDir . $fileName),
        $assetsDir . $fileName
    ];

    foreach ($checks as $p) {
        if ($p && file_exists($p)) {
            $resolvedPath = $p;
            break;
        }
    }

    if ($resolvedPath) {
        $validClips[] = [
            'path' => $resolvedPath,
            'start' => floatval($clip['offset'] ?? 0),
            'duration' => floatval($clip['duration'] ?? 1),
            'type' => $clip['type'] ?? 'video'
        ];
    }
}

if (empty($validClips)) {
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erro Crítico: Nenhum arquivo de mídia real encontrado no servidor para processamento.',
        'details' => 'Os arquivos carregados (blobs) ainda não foram sincronizados com o servidor. Aguarde o upload ou reconecte a mídia.'
    ]);
    exit;
}

// 5. Configurações de Encoder (GPU vs CPU)
$useGPU = isset($settings['useGPU']) ? (bool) $settings['useGPU'] : true;
$videoCodec = 'libx264';
$gpuFlags = "";

// Tenta detectar se h264_nvenc está disponível (NVIDIA) - Funciona no Windows se estiver no PATH
if ($useGPU) {
    // No Windows usamos 'findstr' em vez de 'grep'
    exec("ffmpeg -encoders 2>&1 | findstr h264_nvenc", $gpuCheck, $gpuRet);
    if ($gpuRet === 0 && !empty($gpuCheck)) {
        $videoCodec = 'h264_nvenc';
        // Flags Otimizadas para NVENC: High Quality, Constant Quality (CQ)
        $gpuFlags = "-preset p6 -tune hq -rc vbr -cq 19 -b:v 0 -maxrate 20M -bufsize 20M";
    }
}

// Fallback ou Ajustes de CPU
if ($videoCodec === 'libx264') {
    $crfMap = ['low' => 28, 'medium' => 23, 'high' => 18, 'ultra' => 12];
    $crf = $crfMap[$quality] ?? 23;
    $gpuFlags = "-crf $crf -preset fast -profile:v high -level 4.2";
}

$audioCodec = 'aac';
$ext = 'mp4';
$projectName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $input['project'] ?? 'export_studio');
$outputFile = $projectName . "_" . time() . "." . $ext;
$outputPath = $outputDir . $outputFile;

// 6. Construção Complexa do Filtro FFmpeg
$inputsArr = [];
$filterV = "";
$filterA = "";
$concatIn = "";
$count = count($validClips);

foreach ($validClips as $i => $clip) {
    // Definimos inputs com busca rápida (-ss antes do -i economiza MUITO tempo em arquivos grandes)
    $inputsArr[] = sprintf("-ss %f -t %f -i %s", $clip['start'], $clip['duration'], escapeshellarg($clip['path']));

    // Normalização de Video: Escala + Padding (letterbox) + FPS + Formato pixel
    $filterV .= "[$i:v]scale=$width:$height:force_original_aspect_ratio=decrease,pad=$width:$height:(ow-iw)/2:(oh-ih)/2,fps=$fps,format=yuv420p[v$i];";
    // Normalização de Áudio: Resample para consistência
    $filterA .= "[$i:a]aresample=$audioRate,aformat=sample_fmts=fltp:sample_rates=$audioRate:channel_layouts=stereo[a$i];";
    $concatIn .= "[v$i][a$i]";
}

$filterComplex = "{$filterV}{$filterA}{$concatIn}concat=n=$count:v=1:a=1[outv][outa]";

// 7. Comando Final FFmpeg
$cmd = sprintf(
    'ffmpeg -y %s -filter_complex "%s" -map "[outv]" -map "[outa]" -c:v %s %s -c:a %s -b:a 192k -movflags +faststart %s 2>&1',
    implode(' ', $inputsArr),
    $filterComplex,
    $videoCodec,
    $gpuFlags,
    $audioCodec,
    escapeshellarg($outputPath)
);

// 8. Execução
exec($cmd, $outputLog, $result);

if ($result === 0 && file_exists($outputPath)) {
    $finalSize = filesize($outputPath);
    echo json_encode([
        'status' => 'success',
        'video_url' => 'assets/exports/' . $outputFile,
        'file_size' => $finalSize,
        'codec' => $videoCodec,
        'message' => 'Renderização de alta qualidade concluída.'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erro Crítico na renderização FFmpeg.',
        'log' => $outputLog,
        'debug_cmd' => $cmd
    ]);
}
?>