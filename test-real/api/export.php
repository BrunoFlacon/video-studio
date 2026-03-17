<?php
/**
 * API de Exportação Profissional V3 (FFmpeg com Aceleração por Hardware)
 * Processa a timeline e renderiza o arquivo final em alta qualidade.
 * Suporta clips mistos (video + audio-only) com concat seguro.
 */

// CRÍTICO: Evita timeout do PHP durante renderização longa
set_time_limit(600); // 10 minutos máximo
ini_set('max_execution_time', '600');
ini_set('display_errors', 0);
error_reporting(E_ALL);
ob_start(); // Captura qualquer output inesperado

header('Content-Type: application/json');

// 1. Configurações de Diretórios
$rootDir = dirname(__DIR__) . "/";
$outputDir = $rootDir . "exports/";
$uploadsDir = $rootDir . "uploads/";

if (!is_dir($outputDir))
    @mkdir($outputDir, 0777, true);
if (!is_dir($uploadsDir))
    @mkdir($uploadsDir, 0777, true);

// 2. Recebe Input
$input = json_decode(file_get_contents("php://input"), true);

// GARBAGE COLLECTION (30 Minutos)
try {
    if (is_dir($outputDir)) {
        $files = glob($outputDir . '*');
        $now = time();
        foreach ($files as $file) {
            if (is_file($file) && ($now - filemtime($file) >= 1800)) {
                @unlink($file);
            }
        }
    }
} catch (Exception $e) {
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
$quality = $settings['quality'] ?? 'high';

// 4. Resolução de Caminhos — APENAS clips de VÍDEO (não audio L/R separados)
$clips = $input['clips'] ?? [];
$validClips = [];
$debugPaths = [];
foreach ($clips as $clip) {
    if (!isset($clip['src']))
        continue;

    $clipType = $clip['type'] ?? '';
    if ($clipType === 'audio')
        continue;

    $rawSrc = $clip['serverSrc'] ?? $clip['src'] ?? '';
    $isBlob = (strpos($rawSrc, 'blob:') === 0);

    // Extrai nome do arquivo de qualquer formato
    $fileName = basename($rawSrc);
    if (strpos($fileName, '?') !== false) {
        $fileName = substr($fileName, 0, strpos($fileName, '?'));
    }

    $resolvedPath = "";
    if (!$isBlob && $fileName) {
        $checks = [
            $uploadsDir . $fileName,
            $rootDir . $fileName,
            $rootDir . 'uploads/' . $fileName,
            $rootDir . str_replace('../', '', $rawSrc),
        ];

        foreach ($checks as $p) {
            $realP = realpath($p);
            if ($realP && file_exists($realP)) {
                $resolvedPath = $realP;
                break;
            }
        }
    }

    $debugPaths[] = [
        'rawSrc' => $rawSrc,
        'fileName' => $fileName,
        'type' => $clipType,
        'isBlob' => $isBlob,
        'resolved' => $resolvedPath ?: ($isBlob ? 'PULADO (BLOB)' : 'NÃO ENCONTRADO')
    ];

    if ($resolvedPath) {
        $validClips[] = [
            'path' => $resolvedPath,
            'start' => floatval($clip['offset'] ?? 0),
            'duration' => floatval($clip['duration'] ?? 1),
            'type' => $clipType,
            'transform' => $clip['transform'] ?? null,
            'keyframes' => $clip['keyframes'] ?? []
        ];
    }
}

if (empty($validClips)) {
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erro Crítico: Nenhum arquivo de mídia real encontrado no servidor para processamento.',
        'details' => 'Os arquivos carregados (blobs) ainda não foram sincronizados com o servidor. Aguarde o upload ou reconecte a mídia.',
        'debug' => $debugPaths,
        'input_clips' => $clips,
        'rootDir' => $rootDir,
        'uploadsDir' => $uploadsDir,
        'uploadsExists' => is_dir($uploadsDir),
        'uploadsContents' => is_dir($uploadsDir) ? array_map('basename', glob($uploadsDir . '*')) : []
    ]);
    exit;
}

// 5. Configurações de Encoder (GPU vs CPU)
$useGPU = isset($settings['useGPU']) ? (bool) $settings['useGPU'] : true;
$fillMode = $settings['fillMode'] ?? 'pad'; // 'pad' (preto) ou 'crop' (preencher)
$videoCodec = 'libx264';
$gpuFlags = "";

if ($useGPU) {
    $gpuCheck = [];
    $gpuRet = 1;
    @exec("ffmpeg -encoders 2>&1", $encoderList, $gpuRet);
    if ($gpuRet === 0) {
        foreach ($encoderList as $line) {
            if (strpos($line, 'h264_nvenc') !== false) {
                $videoCodec = 'h264_nvenc';
                // Otimizado para Alta Performance + Alta Qualidade (CQ 19 para fidelidade superior)
                $gpuFlags = "-preset p4 -tune hq -rc vbr -cq 19 -b:v 0 -maxrate 20M -bufsize 40M -profile:v high";
                break;
            }
        }
    }
}

if ($videoCodec === 'libx264') {
    $crfMap = ['low' => 28, 'medium' => 23, 'high' => 18, 'ultra' => 12];
    $crf = $crfMap[$quality] ?? 23;
    // Preset faster para reduzir o tempo de render sem sacrificar muito a qualidade
    $gpuFlags = "-crf $crf -preset faster -profile:v high -level 4.2";
}

$audioCodec = 'aac';
$ext = 'mp4';
$projectName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $input['project'] ?? 'export_studio');
$outputFile = $projectName . "_" . time() . "." . $ext;
$outputPath = $outputDir . $outputFile;

// 6. Funções Auxiliares para Filtros
function buildTransformFilter($clip, $targetW, $targetH, $fps, $globalFillMode)
{
    $t = $clip['transform'] ?? [
        'scale' => 1,
        'rotate' => 0,
        'x' => 0,
        'y' => 0,
        'opacity' => 1,
        'blendMode' => 'normal'
    ];

    $scale = floatval($t['scale'] ?? 1);
    $rotate = floatval($t['rotate'] ?? 0);
    $x = floatval($t['x'] ?? 0);
    $y = floatval($t['y'] ?? 0);
    $opacity = floatval($t['opacity'] ?? 1);

    // Filtro base: Escala para preencher ou caber no canvas alvo
    if ($globalFillMode === 'crop') {
        $baseScale = "scale=$targetW:$targetH:force_original_aspect_ratio=increase,crop=$targetW:$targetH";
    } else {
        $baseScale = "scale=$targetW:$targetH:force_original_aspect_ratio=decrease,pad=$targetW:$targetH:($targetW-iw)/2:($targetH-ih)/2";
    }

    // Aplica Transformações Adicionais
    $filters = [];

    // 0. Espelhamento (Flip) - DEVE vir antes da escala/rotação para funcionar lógico
    if (!empty($t['flipH'])) {
        $filters[] = "hflip";
    }
    if (!empty($t['flipV'])) {
        $filters[] = "vflip";
    }

    $filters[] = $baseScale;

    // Zoom/Escala Adicional (Crop center then scale)
    if ($scale != 1) {
        $sw = intval($targetW / $scale);
        $sh = intval($targetH / $scale);
        $filters[] = "crop=$sw:$sh,scale=$targetW:$targetH";
    }

    // Rotação
    if ($rotate != 0) {
        $rad = $rotate * pi() / 180;
        $filters[] = "rotate=$rad:ow=hypot(iw,ih):oh=ow:c=black@0";
    }

    // Posição (Translate via Pad/Crop ou Overlay se fosse multicamada, aqui usamos pad para mover)
    if ($x != 0 || $y != 0) {
        // Envolve em um canvas maior e corta na posição desejada
        $filters[] = "pad=iw+abs($x*2):ih+abs($y*2):(ow-iw)/2+$x:(oh-ih)/2+$y";
        $filters[] = "crop=$targetW:$targetH";
    }

    // Opacidade
    if ($opacity < 1) {
        $filters[] = "format=rgba,colorchannelmixer=aa=$opacity";
    }

    $filters[] = "fps=$fps";
    $filters[] = "format=yuv420p";

    return implode(",", $filters);
}

// 7. Construção do Comando FFmpeg
$count = count($validClips);
$jobId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['job_id'] ?? 'default');
$progressPath = $outputDir . "progress_" . $jobId . ".txt";

if ($count === 1) {
    // CASO SIMPLES: Um único clip — sem concat, direto e rápido
    $clip = $validClips[0];
    $clipFilter = buildTransformFilter($clip, $width, $height, $fps, $fillMode);

    $cmd = sprintf(
        'ffmpeg -y -ss %f -t %f -i %s -progress %s -vf "%s" -c:v %s %s -c:a %s -b:a 192k -ar %d -ac 2 -movflags +faststart %s 2>&1',
        $clip['start'],
        $clip['duration'],
        escapeshellarg($clip['path']),
        escapeshellarg($progressPath),
        $clipFilter,
        $videoCodec,
        $gpuFlags,
        $audioCodec,
        $audioRate,
        escapeshellarg($outputPath)
    );
} else {
    // CASO MÚLTIPLO: Concat com normalização
    $inputsArr = [];
    $filterV = "";
    $filterA = "";
    $concatIn = "";

    foreach ($validClips as $i => $clip) {
        $inputsArr[] = sprintf("-ss %f -t %f -i %s", $clip['start'], $clip['duration'], escapeshellarg($clip['path']));
        $clipFilter = buildTransformFilter($clip, $width, $height, $fps, $fillMode);
        $filterV .= "[{$i}:v]{$clipFilter}[v{$i}];";
        $filterA .= "[{$i}:a]aresample={$audioRate},aformat=sample_fmts=fltp:sample_rates={$audioRate}:channel_layouts=stereo[a{$i}];";
        $concatIn .= "[v{$i}][a{$i}]";
    }

    $filterComplex = "{$filterV}{$filterA}{$concatIn}concat=n=$count:v=1:a=1[outv][outa]";

    $cmd = sprintf(
        'ffmpeg -y %s -progress %s -filter_complex "%s" -map "[outv]" -map "[outa]" -c:v %s %s -c:a %s -b:a 192k -movflags +faststart %s 2>&1',
        implode(' ', $inputsArr),
        escapeshellarg($progressPath),
        $filterComplex,
        $videoCodec,
        $gpuFlags,
        $audioCodec,
        escapeshellarg($outputPath)
    );
}

// 7. Execução
$outputLog = [];
exec($cmd, $outputLog, $result);

// Limpa qualquer warning/notice capturado pelo ob_start
ob_end_clean();

if ($result === 0 && file_exists($outputPath)) {
    $finalSize = filesize($outputPath);
    echo json_encode([
        'status' => 'success',
        'video_url' => 'exports/' . $outputFile,
        'fileName' => $outputFile,
        'file_size' => $finalSize,
        'codec' => $videoCodec,
        'message' => 'Renderização concluída com sucesso.'
    ]);
} else {
    http_response_code(500);
    // Extrai apenas as últimas 20 linhas do log para não estourar o JSON
    $logTail = array_slice($outputLog, -20);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erro na renderização FFmpeg. Verifique o log.',
        'log' => $logTail,
        'debug_cmd' => $cmd,
        'clips_count' => $count,
        'codec' => $videoCodec
    ]);
}
?>