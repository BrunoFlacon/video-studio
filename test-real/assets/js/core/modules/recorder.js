/**
 * Módulo Profissional de Gravação (Áudio e Vídeo)
 * Padrão CSP: Sem eval, sem new Function, sem inline events.
 */

let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let timerInterval = null;

// Elementos da UI (serão passados na inicialização)
let ui = {
    overlay: null,
    preview: null,
    timer: null,
    btnStop: null
};

// Configuração de Codecs (Preferência por leveza na captura)
const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4' // Safari fallback
];

/**
 * Inicializa os ouvintes dos botões
 */
export function initRecorder(btnAudio, btnVideo, overlayEl, previewEl, timerEl, btnStopEl, onComplete) {
    ui = { overlay: overlayEl, preview: previewEl, timer: timerEl, btnStop: btnStopEl };

    // Botão Áudio
    btnAudio.addEventListener('click', () => startRecording('audio', onComplete));

    // Botão Vídeo
    btnVideo.addEventListener('click', () => startRecording('video', onComplete));

    // Botão Parar (dentro do overlay)
    ui.btnStop.addEventListener('click', stopRecording);
}

async function startRecording(type, callback) {
    try {
        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 48000 // Alta qualidade para o AAC posterior
            },
            video: type === 'video' ? { width: 1280, height: 720, frameRate: 30 } : false
        };

        // 1. Pede permissão e pega o stream
        stream = await navigator.mediaDevices.getUserMedia(constraints);

        // 2. Configura visualização
        ui.preview.srcObject = stream;
        ui.preview.muted = true; // Muta localmente para evitar microfonia

        // Ajusta UI (Modo Audio vs Video)
        if (type === 'audio') {
            ui.overlay.querySelector('.camera-box').classList.add('audio-only');
        } else {
            ui.overlay.querySelector('.camera-box').classList.remove('audio-only');
        }
        ui.overlay.classList.remove('hidden');

        // 3. Escolhe o melhor codec suportado
        const options = { mimeType: mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '' };

        // 4. Inicia gravador
        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            finalizeRecording(type, callback);
        };

        mediaRecorder.start();
        startTimer();

    } catch (err) {
        alert("Erro: Verifique permissões de câmera/microfone.");
        closeOverlay();
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function finalizeRecording(type, callback) {
    // 1. Gera o Blob final
    const mimeType = mediaRecorder.mimeType; // ex: 'video/webm' ou 'audio/webm'
    const blob = new Blob(recordedChunks, { type: mimeType });

    // 2. Cria URL segura
    const url = URL.createObjectURL(blob);

    // 3. Define extensão e tipo para a biblioteca
    const ext = type === 'audio' ? 'weba' : 'webm'; // Usamos webm nativo (converteremos para mp4/mp3 no export)
    const fileName = `Rec_${type.toUpperCase()}_${new Date().toLocaleTimeString()}.${ext}`;
    const fileType = type === 'audio' ? 'audio/webm' : 'video/webm';

    // 4. Limpa tudo
    stopStream();
    closeOverlay();

    // 5. Retorna para o Editor
    callback(fileName, url, fileType);
}

// --- Utilitários ---

function stopStream() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    stopTimer();
}

function closeOverlay() {
    ui.overlay.classList.add('hidden');
    ui.preview.srcObject = null;
}

function startTimer() {
    let seconds = 0;
    ui.timer.textContent = "00:00";
    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        ui.timer.textContent = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}
