import { state, addClipToState, updatePlayheadPosition, updateVideoTimeFromClick } from './modules/state.js';
import { renderTimeline } from './modules/timeline.js'; // Ajustado para module correto
import { initPlayhead } from './modules/playhead.js'; // Ajustado se tiver module
import { drawWaveform } from './modules/audio.js';
import { setupRecorder } from './modules/recorder.js'; // Nome correto da função exportada
import { handleExportProcess } from './modules/export-bridge.js';
import { addTextOverlay } from './modules/text-layer.js'; // Faltava importar

// --- CONFIGURAÇÕES GLOBAIS ---
const PIXELS_PER_SECOND = 100;

// --- SELEÇÃO DE ELEMENTOS (CENTRALIZADA) ---
// Seleciona tudo uma vez só para evitar erros de "null" e melhorar performance
const elements = {
    // Workspace
    workspace: document.querySelector('.workspace'),
    previewVideo: document.getElementById('previewVideo'),
    overlayLayer: document.getElementById('overlayLayer'),

    // Timeline
    timeline: document.getElementById('timeline'),
    videoTrack: document.getElementById('videoTrack'),
    audioTrack: document.getElementById('audio-a'),
    playhead: document.getElementById('playhead'),
    canvasWaveform: document.getElementById('waveform'),

    // Tools / Sidebar
    mediaInput: document.getElementById('mediaInput'),
    mediaLibrary: document.getElementById('mediaLibrary'),
    btnImport: document.getElementById('btnImportTrigger'), // ID corrigido conforme HTML anterior

    // Recorder
    btnRecAudio: document.getElementById('btnRecAudio'),
    btnRecVideo: document.getElementById('btnRecVideo'),
    camOverlay: document.getElementById('cameraOverlay'),
    camPreview: document.getElementById('cameraPreview'),
    recTimer: document.getElementById('recordTimer'),
    btnStopRec: document.getElementById('btnStopRecord'),

    // Add Elements
    btnAddText: document.getElementById('btnAddText'),
    btnAddLower: document.getElementById('btnAddLower'),

    // Export
    btnExport: document.getElementById('exportBtn'),
    selectPreset: document.getElementById('exportPreset')
};

// --- FUNÇÃO DE INICIALIZAÇÃO (BOOTSTRAP) ---
function init() {
    // 

    setupEventListeners();
    setupRecorderModule();

    // Renderiza estado inicial da timeline (vazia)
    if (elements.videoTrack) {
        renderTimeline(elements.videoTrack, PIXELS_PER_SECOND);
    }

    // Inicializa comportamento da agulha (Drag & Drop)
    if (elements.playhead && elements.timeline) {
        // Importante: A lógica de initPlayhead deve estar em modules/playhead.js
        // Se não tiver esse arquivo, a lógica deve ser inline aqui.
        // Assumindo que você tem o arquivo playhead.js correto:
        // initPlayhead(elements.playhead, elements.timeline, (percent, px) => syncVideoToTimeline(percent));
    }
}

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupEventListeners() {

    // 1. Importação de Mídia
    if (elements.btnImport) {
        elements.btnImport.addEventListener('click', () => {
            elements.mediaInput.click();
        });
    }

    if (elements.mediaInput) {
        elements.mediaInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const url = URL.createObjectURL(file);
                addToLibrary(file.name, url, file.type);
            });
            elements.mediaInput.value = ''; // Limpa para permitir re-seleção
        });
    }

    // 2. Drag & Drop na Timeline
    if (elements.videoTrack) {
        elements.videoTrack.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            elements.videoTrack.style.borderColor = '#6366f1';
        });

        elements.videoTrack.addEventListener('dragleave', () => {
            elements.videoTrack.style.borderColor = '#333';
        });

        elements.videoTrack.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.videoTrack.style.borderColor = '#333';

            const src = e.dataTransfer.getData('text/plain');

            if (src) {
                const rect = elements.videoTrack.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const startTime = Math.max(0, offsetX / PIXELS_PER_SECOND);

                addClipToState(src, startTime);
                renderTimeline(elements.videoTrack, PIXELS_PER_SECOND);
            }
        });
    }

    // 3. Exportação Inteligente
    if (elements.btnExport) {
        elements.btnExport.addEventListener('click', () => {
            const preset = elements.selectPreset.value;
            handleExportProcess(preset);
        });
    }

    // 4. Sincronização Vídeo <-> Timeline
    if (elements.previewVideo) {
        // Vídeo andando -> move agulha
        elements.previewVideo.addEventListener('timeupdate', () => {
            updatePlayheadPosition(elements.playhead, elements.previewVideo, PIXELS_PER_SECOND);
        });

        // Carregou vídeo -> desenha onda
        elements.previewVideo.addEventListener('loadeddata', () => {
            drawWaveform(elements.previewVideo, elements.canvasWaveform);
        });
    }

    // Clique na régua da timeline -> move vídeo
    if (elements.timeline) {
        elements.timeline.addEventListener('click', (e) => {
            updateVideoTimeFromClick(e, elements.timeline, elements.previewVideo, PIXELS_PER_SECOND);
        });
    }

    // 5. Botões de Texto
    if (elements.btnAddText) {
        elements.btnAddText.addEventListener('click', () => {
            addTextOverlay(elements.overlayLayer, "Novo Texto");
        });
    }
    if (elements.btnAddLower) {
        elements.btnAddLower.addEventListener('click', () => {
            addTextOverlay(elements.overlayLayer, "Lower Third", true);
        });
    }
}

// --- SETUP DO GRAVADOR ---
function setupRecorderModule() {
    if (elements.btnRecAudio && elements.btnRecVideo) {
        setupRecorder(
            elements.btnRecAudio,
            elements.btnRecVideo,
            elements.camOverlay,
            elements.camPreview,
            elements.recTimer,
            elements.btnStopRec,
            (name, url, type) => {
                // Callback de sucesso
                addToLibrary(name, url, type);
            }
        );
    }
}

// --- FUNÇÕES AUXILIARES DE UI ---
function addToLibrary(name, url, type) {
    if (!elements.mediaLibrary) return;

    const item = document.createElement('div');
    item.className = 'media-item';
    item.textContent = name.length > 20 ? name.substring(0, 20) + '...' : name;
    item.draggable = true;
    item.dataset.src = url;
    item.dataset.type = type;

    // Estilo básico para distinguir audio/video
    if (type.includes('audio')) {
        item.style.borderLeft = "3px solid #10b981"; // Verde
    } else {
        item.style.borderLeft = "3px solid #6366f1"; // Roxo
    }

    // Drag Start
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', url);
        e.dataTransfer.effectAllowed = 'copy';
    });

    // Preview ao clicar duas vezes
    item.addEventListener('dblclick', () => {
        if (elements.previewVideo) {
            elements.previewVideo.src = url;
            elements.previewVideo.play();
        }
    });

    // Delete Button (X)
    const btnDel = document.createElement('button');
    btnDel.className = 'media-delete-btn';
    btnDel.textContent = '\u00D7';
    btnDel.title = 'Remover da biblioteca';
    btnDel.onclick = (e) => {
        e.stopPropagation();
        item.remove();
        // Remove from state/localstorage if implemented
    };
    item.appendChild(btnDel);

    elements.mediaLibrary.appendChild(item);
}

// Inicia tudo
init();
