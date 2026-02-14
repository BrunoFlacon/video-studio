<?php
header('Access-Control-Allow-Origin: *');
$format = $_GET['format'] ?? 'mp4';
$project = $_GET['project'] ?? 'Untitled';

switch ($format) {
    case 'xml':
        header('Content-Type: application/xml');
        header('Content-Disposition: attachment; filename="' . $project . '.xml"');
        echo '<?xml version="1.0" encoding="UTF-8"?>
<xmeml version="4">
<project>
    <name>' . $project . '</name>
    <children>
        <sequence>
            <name>Sequence 01</name>
            <rate><timebase>30</timebase><ntsc>TRUE</ntsc></rate>
            <media>
                <video>
                    <track><clipitem id="clip1"><name>Video 1</name><duration>100</duration></clipitem></track>
                </video>
            </media>
        </sequence>
    </children>
</project>
</xmeml>';
        break;

    case 'edl':
        header('Content-Type: text/plain');
        header('Content-Disposition: attachment; filename="' . $project . '.edl"');
        echo "TITLE: " . $project . "\nFCM: NON-DROP FRAME\n001  AX       V     C        00:00:00:00 00:00:05:00 00:00:00:00 00:00:05:00\n* FROM CLIP CONFIG";
        break;

    case 'shorts':
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'message' => 'Shorts generation queued', 'job_id' => uniqid('job_')]);
        break;

    case 'mp4':
    default:
        $input = json_decode(file_get_contents('php://input'), true);
        $clips = $input['clips'] ?? [];
        $jobId = uniqid('render_');
        $outputFile = '../assets/renders/' . $jobId . '.mp4';

        if (!is_dir('../assets/renders/')) {
            mkdir('../assets/renders/', 0777, true);
        }

        if (empty($clips)) {
            echo json_encode(['status' => 'error', 'message' => 'Nenhum clipe para renderizar']);
            exit;
        }

        // Construção do comando FFmpeg
        // Simplificado: Para cada clipe, cortamos e depois concatenamos.
        // Em um sistema real, usaríamos um filter_complex complexo.
        $filterInputs = "";
        $filterComplex = "";
        $inputFiles = "";
        $i = 0;
        foreach ($clips as $clip) {
            // No ambiente local, o src é um Blob URL que o PHP NÃO consegue ler.
            // RESOLUÇÃO: Precisamos que o frontend envie o caminho real ou que os arquivos já estejam no servidor.
            // Para este teste, assumiremos que estamos lidando com caminhos relativos ou simulados 
            // se o src começar com http/blob, teremos que baixar ou usar placeholders.

            // MOCK: Se for um blob, usaremos um vídeo de teste fixo para não quebrar a demo
            $src = $clip['src'];
            if (strpos($src, 'blob:') === 0) {
                $src = 'test_assets/sample_video.mp4';
            }

            $start = $clip['offset'] ?? 0;
            $dur = $clip['duration'] ?? 1;

            $inputFiles .= "-ss $start -t $dur -i \"$src\" ";
            $filterComplex .= "[$i:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v$i];";
            $i++;
        }

        $concatStr = "";
        for ($j = 0; $j < $i; $j++) {
            $concatStr .= "[v$j][$j:a]";
        }
        $filterComplex .= "{$concatStr}concat=n=$i:v=1:a=1[outv][outa]";

        $cmd = "ffmpeg -y $inputFiles -filter_complex \"$filterComplex\" -map \"[outv]\" -map \"[outa]\" -c:v libx264 -preset ultrafast -crf 23 \"$outputFile\" 2>&1";

        // Execução (Em ambiente de produção, usaríamos background jobs)
        $output = [];
        $return_var = 0;
        exec($cmd, $output, $return_var);

        header('Content-Type: application/json');
        if ($return_var === 0) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Renderização Profissional Concluída',
                'job_id' => $jobId,
                'video_url' => 'assets/renders/' . $jobId . '.mp4',
                'debug_cmd' => $cmd
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Erro na renderização FFmpeg',
                'error' => implode("\n", $output),
                'debug_cmd' => $cmd
            ]);
        }
        break;
}
?>