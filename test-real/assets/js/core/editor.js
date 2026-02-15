import {
    state,
    addClipToState,
    addTrackToState,
    updatePlayheadPosition,
    updateVideoTimeFromClick,
    getProjectDuration,
    formatTime,
    loadState,
    saveState,
    takeSnapshot,
    splitClip,
    deleteClip,
    addMarker,
    events
} from './modules/state.js';
import { renderTimeline, splitAtPlayhead, deleteSelectedClip } from './modules/timeline.js';
import { initPlayhead } from './modules/playhead.js';
import { drawWaveform, analyzeAudioChannels, getFastMetadata } from './modules/audio.js';
import { initRecorder } from './modules/recorder.js';
import { initExport } from './modules/export.js';
import { addTextOverlay } from './modules/text-layer.js';
import { startAutoSave, showRecentProjectsModal, showSaveAsDialog, importProject, showToast, addToRecentProjects } from './modules/file-operations.js';
import { addLowerThird } from './modules/lower-third.js';
import { showEffectsPanel } from './modules/effects.js';
import { showPluginImportDialog } from './modules/plugin-import.js';
import { history } from './modules/history.js';
import { tempCleanup } from './modules/temp-cleanup.js';

// --- SELEÇÃO DE ELEMENTOS (CENTRALIZADA) ---
const elements = {
    workspace: document.querySelector('.workspace'),
    previewVideo: document.getElementById('previewVideo'),
    timeDisplay: document.getElementById('timeDisplay'),
    overlayLayer: document.getElementById('overlayLayer'),
    timeline: document.getElementById('timeline'),
    videoTrack: document.getElementById('videoTrack'),
    audioTrack: document.getElementById('audioTrack'),
    playhead: document.getElementById('playhead'),
    canvasWaveform: document.getElementById('waveform'),
    mediaInput: document.getElementById('mediaInput'),
    mediaLibrary: document.getElementById('mediaLibrary'),
    btnRecAudio: document.getElementById('btnRecAudio'),
    btnRecVideo: document.getElementById('btnRecVideo'),
    camOverlay: document.getElementById('cameraOverlay'),
    camPreview: document.getElementById('cameraPreview'),
    recTimer: document.getElementById('recordTimer'),
    btnStopRec: document.getElementById('btnStopRecord'),
    btnAddText: document.getElementById('btnAddText'),
    btnAddLower: document.getElementById('btnAddLower'),
    btnExport: document.getElementById('exportBtn'),
    selectPreset: document.getElementById('exportPreset'),
    emptyState: document.getElementById('emptyState'),
    // Toggles Sidebar
    toggleSearch: document.getElementById('toggleSearchReplace'),
    toggleLibrary: document.getElementById('toggleLibrary'),
    searchSection: document.getElementById('searchReplaceSection'),
    librarySection: document.getElementById('librarySection'),
    btnCinemaMode: document.getElementById('btnCinemaMode'),
    // Toolbar Tools
    btnSelect: document.getElementById('btnSelect'),
    btnHand: document.getElementById('btnHand'),
    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),
    timelineContainer: document.querySelector('.timeline-container')
};

// Global state for playback
let playbackRAF = null;
let lastTime = 0;
let isPlayingGlobal = false;
let globalTime = 0;

// --- ESTADO DE FERRAMENTAS ---
let activeTool = 'select'; // 'select' ou 'hand'
window.selectedClips = new Set(); // Multi-seleção de clips

// Atualiza estado visual dos botões de ferramentas
function updateToolButtons() {
    if (elements.btnSelect) {
        elements.btnSelect.classList.toggle('active', activeTool === 'select');
    }
    if (elements.btnHand) {
        elements.btnHand.classList.toggle('active', activeTool === 'hand');
    }
}

// Atualiza estado dos botões Undo/Redo
function updateUndoRedoButtons() {
    if (elements.btnUndo) {
        elements.btnUndo.disabled = !history || history.index < 0;
        elements.btnUndo.style.setProperty('opacity', elements.btnUndo.disabled ? '0.4' : '1');
    }
    if (elements.btnRedo) {
        elements.btnRedo.disabled = !history || history.index >= (history.stack?.length - 1 || -1);
        elements.btnRedo.style.setProperty('opacity', elements.btnRedo.disabled ? '0.4' : '1');
    }
}

// --- UTILITÁRIOS GLOBAIS DE RENDER E SALVAMENTO ---
let renderRAF = null;
export const throttledRender = () => {
    if (renderRAF) cancelAnimationFrame(renderRAF);
    renderRAF = requestAnimationFrame(() => {
        if (elements.timeline) {
            const layout = renderTimeline(elements.timeline, state.pxPerSecond);
            updatePlayheadPosition(elements.playhead, globalTime, state.pxPerSecond, false, layout);
        }
        debouncedSave();
    });
};

let saveTimeout = null;
export const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveState();
    }, 1000); // Salva 1s após a última mudança
};
async function init() {
    window.state = state; // Expõe globalmente para módulos legados
    state.videoElement = elements.previewVideo;
    window.audioUnlocked = false;

    // Tenta carregar projeto anterior (Prioridade Alta)
    await loadState();

    // Captura estado inicial no histórico (permitindo desfazer até o começo)
    if (history && history.stack.length === 0) {
        history.addAction('init', 'Estado Inicial');
    }

    // Inicializa o Audio Pool (APENAS UMA VEZ)
    initAudioPool();

    setupEventListeners();

    // Cinema Mode Toggle
    if (elements.btnCinemaMode) {
        elements.btnCinemaMode.addEventListener('click', () => {
            const isCinema = document.body.classList.toggle('cinema-mode');

            // Aplica classe CSS no vídeo para aumentar tamanho
            if (elements.previewVideo) {
                if (isCinema) {
                    elements.previewVideo.classList.add('preview-cinema');
                } else {
                    elements.previewVideo.classList.remove('preview-cinema');
                }
            }

            // Troca o ícone
            if (isCinema) {
                // Estado: CINEMA MODE - Seta ACIMA (4.5px de distância)
                elements.btnCinemaMode.innerHTML = `<svg viewBox="0 0 24 24" width="20px" height="20px" fill="currentColor" role="presentation">
<path fill-rule="evenodd" clip-rule="evenodd" d="M18 6H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3ZM6 8h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"></path>
<path d="M9.086 4.43 12 1.518l2.914 2.912 1.414-1.413L12.06-.251a1.5 1.5 0 0 0-2.121 0L6.67 3.017l1.414 1.414Z"></path></svg>`;
                elements.btnCinemaMode.title = "Restaurar Timeline";
                elements.btnCinemaMode.classList.add('active');
            } else {
                // Estado: NORMAL - Seta ABAIXO (4.5px de distância)
                elements.btnCinemaMode.innerHTML = `<svg viewBox="0 0 24 24" width="20px" height="20px" fill="currentColor">
<path fill-rule="evenodd" clip-rule="evenodd" d="M18 6H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3ZM6 8h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"></path>
<path d="M14.914 19.5 12 22.412 9.086 19.5 7.67 20.913l3.268 3.268a1.5 1.5 0 0 0 2.121 0l3.268-3.268-1.414-1.414Z"></path></svg>`;
                elements.btnCinemaMode.title = "Minimizar Timeline (Cinema Mode)";
                elements.btnCinemaMode.classList.remove('active');
            }

            // Força resize do vídeo se necessário
            setTimeout(() => {
                if (window.onResize) window.onResize();
            }, 300);
        });
    }

    // --- FERRAMENTAS DA TOOLBAR ---
    if (elements.btnSelect) {
        elements.btnSelect.addEventListener('click', () => {
            activeTool = 'select';
            updateToolButtons();
            if (elements.timelineContainer) elements.timelineContainer.style.cursor = 'default';
        });
    }

    if (elements.btnHand) {
        elements.btnHand.addEventListener('click', () => {
            activeTool = 'hand';
            updateToolButtons();
            if (elements.timelineContainer) elements.timelineContainer.style.cursor = 'grab';
        });
    }

    if (elements.btnUndo) {
        elements.btnUndo.addEventListener('click', () => {
            if (history.undo()) {
                throttledRender();
                updateUndoRedoButtons();
                // showToast('Ação desfeita', 'success'); // Removido para menos poluição visual no clique repetido
            }
        });
    }

    if (elements.btnRedo) {
        elements.btnRedo.addEventListener('click', () => {
            if (history.redo()) {
                throttledRender();
                updateUndoRedoButtons();
                // showToast('Ação refeita', 'success');
            }
        });
    }

    // Inicializa estado dos botões
    updateToolButtons();
    updateUndoRedoButtons();

    // Inicializações Fragmentadas (Baixa Prioridade) para evitar bloqueio da thread principal
    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            setupRecorderModule();
            requestIdleCallback(() => {
                initExport(elements.btnExport, elements.selectPreset);
                requestIdleCallback(() => {
                    autoLoadFirstVideo();
                });
            });
        });
    } else {
        setTimeout(() => {
            setupRecorderModule();
            setTimeout(() => {
                initExport(elements.btnExport, elements.selectPreset);
                autoLoadFirstVideo();
            }, 50);
        }, 50);
    }

    // === ZOOM SLIDER ===
    const zoomSlider = document.getElementById('zoomSlider');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            // Escala logarítmica para sensação natural de zoom
            // Min: 1 (1px/s) -> Max: 100 (500px/s)

            // Fórmula: base * (multiplicador ^ (valor / max_valor))
            // Ajuste fino para cobrir de 5px/s a 500px/s
            const minZoom = 0.1;
            const maxZoom = 10000;
            const percent = value / 1000; // Ajustado para novo slider max 1000 ou 2000

            // Logarithmic interpolation
            const newPxPerSec = minZoom * Math.pow(maxZoom / minZoom, percent);

            state.pxPerSecond = newPxPerSec;

            // Throttled Render (não usar debounce para feedback visual imediato, mas requestAnimationFrame já cuida disso)
            if (!window.isRendering) {
                window.requestAnimationFrame(() => {
                    renderTimeline(elements.timeline, state.pxPerSecond);
                    updatePlayheadPosition(elements.playhead, globalTime, state.pxPerSecond, false);
                });
            }
        }, { passive: true }); // Passive melhora a rolagem em mobile/touch
    }

    // Inicializa valor do slider baseado no state atual
    if (zoomSlider && state.pxPerSecond) {
        // Reverse log calculation
        const minZoom = 0.1;
        const maxZoom = 10000;
        const percent = Math.log(state.pxPerSecond / minZoom) / Math.log(maxZoom / minZoom);
        zoomSlider.value = Math.max(1, Math.min(100, percent * 100));
    }

    // Eventos de Zoom consolidados em setupEventListeners() para evitar redundância

    // Re-render quando o estado muda (Restaurado)
    events.addEventListener('render', () => {
        if (elements.timeline) {
            requestAnimationFrame(() => renderTimeline(elements.timeline, state.pxPerSecond));
        }

        // Sincroniza o preset de exportação se existir
        if (elements.selectPreset && state.projectSettings) {
            const w = state.projectSettings.width;
            const h = state.projectSettings.height;

            // Tenta encontrar um preset que corresponda aos valores atuais
            const presetMap = {
                'hd': w === 1080 && h === 720,
                'fullhd': w === 1080 && h === 1920,
                '4k': w === 3840 && h === 2160,
                'vertical': w === 1920 && h === 1080
            };

            const matchedPreset = Object.keys(presetMap).find(key => presetMap[key]);
            if (matchedPreset) {
                elements.selectPreset.value = matchedPreset;
            } else {
                // Se não bater com nenhum preset, podemos opcionalmente desmarcar ou mostrar "Custom"
                // Para manter simples, não forçamos um valor se não houver match
            }
        }

        setTimeout(() => seekTo(globalTime), 10);
    });

    // WINDOWED RENDER: Atualiza a régua ao scrollar
    if (elements.timeline) {
        elements.timeline.addEventListener('scroll', () => {
            if (!renderRAF) throttledRender();
        }, { passive: true });
    }

    // Sincroniza Undo/Redo automaticamente quando o histórico muda (via teclado ou botões)
    document.addEventListener('historyChanged', () => {
        updateUndoRedoButtons();
    });

    // Setup inicial de exportação e outros módulos...

    if (elements.timeline) {
        renderTimeline(elements.timeline, state.pxPerSecond);
    }

    if (elements.playhead && elements.timeline) {
        initPlayhead(elements.playhead, elements.timeline, (relX) => {
            const time = relX / state.pxPerSecond;
            seekTo(time);
        });
    }

    updateTimeClock();
    autoLoadFirstVideo();

    // Ativa AudioContext no primeiro clique (Necessário para CSP/Autoplay Política)
    const unlockAudio = async () => {
        window.audioUnlocked = true;
        if (!window.audioCtx) {
            window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (window.audioCtx.state === 'suspended') {
            await window.audioCtx.resume();
        }
        if (elements.timeline) {
            requestAnimationFrame(() => renderTimeline(elements.timeline, state.pxPerSecond));
        }
        window.removeEventListener('mousedown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('mousedown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
}


function autoLoadFirstVideo() {
    if (!elements.previewVideo || elements.previewVideo.src) return;
    const firstVideo = state.clips.find(c =>
        c.type.includes('video') &&
        !c.offline &&
        !(window.deadMediaSet && window.deadMediaSet.has(c.src))
    );
    if (firstVideo) {
        elements.previewVideo.src = firstVideo.src;
        elements.previewVideo.muted = true; // Mudo para não duplicar com as trilhas A/B
        elements.previewVideo.load();
    }
}

function seekTo(time) {
    if (isNaN(time)) time = 0;

    // Snap magnético para marcadores (±0.2s de tolerância)
    const SNAP_THRESHOLD = 0.2;
    if (state.markers && state.markers.length > 0) {
        const nearestMarker = state.markers.find(marker => {
            const mTime = (typeof marker === 'number') ? marker : (marker.time || 0);
            return Math.abs(mTime - time) < SNAP_THRESHOLD;
        });

        if (nearestMarker) {
            time = (typeof nearestMarker === 'number') ? nearestMarker : nearestMarker.time;
        }
    }

    globalTime = Math.max(0, time);

    // Detecta qual clip de vídeo está na posição atual
    const activeVideoClip = state.clips.find(c =>
        c.type && c.type.includes('video') &&
        globalTime >= c.start &&
        globalTime <= (c.start + c.duration) &&
        !c.offline &&
        !(window.deadMediaSet && window.deadMediaSet.has(c.src))
    );

    if (elements.previewVideo && activeVideoClip) {
        // Carrega o vídeo correto se necessário
        if (elements.previewVideo.src !== activeVideoClip.src) {
            elements.previewVideo.src = activeVideoClip.src;
            elements.previewVideo.muted = true;
            elements.previewVideo.load();
        }

        // Ajusta o currentTime para o offset correto dentro do clip
        const timeInClip = globalTime - activeVideoClip.start;
        const targetVideoTime = (activeVideoClip.offset || 0) + timeInClip;
        elements.previewVideo.currentTime = targetVideoTime;
    }

    updatePlayheadPosition(elements.playhead, globalTime, state.pxPerSecond);
    syncSecondaryAudios(globalTime, isPlayingGlobal);
    updateTimeClock();
}

function updateTimeClock() {
    if (elements.timeDisplay) {
        const total = getProjectDuration();
        elements.timeDisplay.textContent = `${formatTime(globalTime)} / ${formatTime(total)}`;
    }
}

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupEventListeners() {
    const btnImportMedia = document.getElementById('btnImportMedia');
    if (btnImportMedia) {
        btnImportMedia.addEventListener('click', () => elements.mediaInput.click());
    }

    if (elements.mediaInput) {
        elements.mediaInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files).sort((a, b) => a.lastModified - b.lastModified);
            if (files.length === 0) return;

            showToast(`Carregando ${files.length} arquivo(s)...`, 'info');

            for (const file of files) {
                const localUrl = URL.createObjectURL(file);
                // Adiciona imediatamente à biblioteca
                addToLibrary(file.name, localUrl, file.type);

                // Dispara o upload em background
                import('./modules/uploader.js').then(async (m) => {
                    const uploadResult = await m.uploadMedia(file);
                    if (uploadResult && uploadResult.filename) {
                        const serverUrl = `uploads/${uploadResult.filename}`;
                        // Procura no state e atualiza todos os clips que usam este blob local
                        state.clips.forEach(c => {
                            if (c.src === localUrl) {
                                c.serverSrc = serverUrl;
                            }
                        });
                        saveState();
                        showToast(`Upload concluído: ${file.name}`, 'success', 1000);
                    }
                });
            }
            elements.mediaInput.value = '';
        });
    }

    takeSnapshot();
    // deleteSelectedClip removido daqui (deve ser chamado via tecla ou botão, não no load)

    // === SECTION TOGGLES (Sidebar & Menus) ===
    // Centraliza o comportamento de toggle para evitar duplicidade
    document.querySelectorAll('.menu-section-header, .section-toggle').forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que clique no header dispare outros eventos
            let section = null;

            if (header.classList.contains('section-toggle')) {
                const targetId = header.getAttribute('data-target');
                if (targetId) section = document.getElementById(targetId);
            }

            if (!section) {
                section = header.closest('.menu-section') || header.parentElement;
            }

            if (!section) return;

            section.classList.toggle('collapsed');
            if (header.classList.contains('section-toggle')) {
                header.setAttribute('aria-expanded', String(!section.classList.contains('collapsed')));
            }

            // Accordion Universal: Recolhe todos os IRMÃOS abertos
            if (section && !section.classList.contains('collapsed')) {
                const parent = section.parentElement;
                if (parent) {
                    // Encontra todos os outros menus no mesmo nível
                    const siblings = Array.from(parent.children).filter(child =>
                        child !== section &&
                        child.classList.contains('menu-section') &&
                        !child.classList.contains('collapsed')
                    );

                    siblings.forEach(sibling => {
                        sibling.classList.add('collapsed');

                        // Atualiza ARIA do irmão fechado
                        const siblingToggle = sibling.querySelector('.section-toggle') ||
                            document.querySelector(`[data-target="${sibling.id}"]`);

                        if (siblingToggle) {
                            siblingToggle.setAttribute('aria-expanded', 'false');
                        }
                    });
                }

                // Auto-scroll apenas se for menu principal (direto na sidebar)
                if (parent.classList.contains('sidebar')) {
                    setTimeout(() => {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            }
        });
    });

    // Special Toggles (Apenas para o que não é coberto pelo padrão acima)
    const toggleSidebar = document.getElementById('toggleSidebar');
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                toggleSidebar.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
            }
        });
    }

    // === FILE & PROJECT MENU ===
    const menuActions = {
        'menuNew': () => {
            import('./modules/sequence-settings.js').then(m => m.showSequenceSettings()).catch(err => alert("Erro ao carregar configurações: " + err.message));
        },
        'menuSave': () => { saveState(); showToast('Projeto Salvo', 'success'); },
        'menuImport': () => elements.mediaInput?.click(),
        'menuRename': () => {
            const input = document.getElementById('projectName');
            if (input) {
                // Delay sutil para evitar conflitos de foco se o menu ainda estiver fechando
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 50);
            }
        },
        'menuAbrir': () => document.getElementById('projectInput')?.click(),
        'menuAbrirRecentes': () => showRecentProjectsModal(),
        'menuSalvarcomo': () => showSaveAsDialog(),
        'menuTranscrever': () => showToast('Transcrição: Em implementação', 'info'),
        'menuSequence': () => {
            import('./modules/sequence-settings.js').then(m => m.showSequenceSettings()).catch(err => alert("Erro ao abrir sequência: " + err.message));
        },
        'menuPlugins': () => showPluginImportDialog(),
        'btnAddEfeitos': () => showEffectsPanel(),
        'btnHistorico': () => history.showHistoryPanel()
    };

    Object.entries(menuActions).forEach(([id, action]) => {
        document.getElementById(id)?.addEventListener('click', action);
    });

    document.getElementById('projectName')?.addEventListener('change', (e) => {
        const newName = e.target.value;
        document.title = newName.replace('.xml', '') + ' - Studio Live-PRO';
        saveState();
        addToRecentProjects(newName);
    });

    document.getElementById('projectInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) { await importProject(file); e.target.value = ''; }
    });

    // === EDITING TOOLS (Toolbar) ===
    const toolActions = {
        'toolSplit': () => {
            takeSnapshot();
            const success = splitAtPlayhead(elements.timeline, state.pxPerSecond, globalTime);
            if (success) { history.addAction('split-clip', 'Corte na agulha'); showToast('Corte realizado', 'success'); }
        },
        'btnCutTimeline': () => {
            takeSnapshot();
            const success = splitAtPlayhead(elements.timeline, state.pxPerSecond, globalTime);
            if (success) { history.addAction('split-clip', 'Corte (Atalho)'); }
        },
        'toolDelete': () => {
            if (state.selectedClipId) {
                takeSnapshot();
                deleteClip(state.selectedClipId);
                history.addAction('delete-clip', 'Clip removido');
                showToast('Clip removido', 'info');
            }
        },
        'btnDeleteClip': () => {
            takeSnapshot();
            deleteSelectedClip(elements.timeline, state.pxPerSecond);
        }
    };

    Object.entries(toolActions).forEach(([id, action]) => {
        document.getElementById(id)?.addEventListener('click', action);
    });

    // === INSERTION TOOLS ===
    document.getElementById('btnAddLower')?.addEventListener('click', () => {
        addLowerThird();
        history.addAction('lower-third', 'Adicionado Lower Third');
    });

    document.getElementById('btnAddCamada')?.addEventListener('click', () => {
        showToast('Camada de ajuste adicionada', 'success');
        history.addAction('add-layer', 'Adicionada Camada de Ajuste');
    });

    document.getElementById('btnAddFiltros')?.addEventListener('click', () => {
        showEffectsPanel(null, 'video');
    });

    document.getElementById('btnAddPreset')?.addEventListener('click', () => {
        import('./modules/presets.js').then(m => m.showPresetsPanel()).catch(err => alert("Erro ao abrir presets: " + err.message));
    });

    // Adição de trilha agora é tratada via delegação de eventos no elements.timeline (linha 487)
    document.getElementById('btnSnap')?.addEventListener('click', (e) => {
        state.snapEnabled = !state.snapEnabled;
        e.currentTarget.classList.toggle('active', state.snapEnabled);
    });

    // Toggle Audio Viz
    const btnToggleAudioViz = document.getElementById('toggleAudioViz');
    const audioViz = document.getElementById('audioViz');
    if (btnToggleAudioViz && audioViz) {
        btnToggleAudioViz.addEventListener('click', () => {
            audioViz.classList.toggle('collapsed');
        });
    }

    // Cloud Service Buttons
    document.querySelectorAll('.cloud-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Silence cloud buttons for now
        });
    });

    if (elements.timeline) {
        elements.timeline.addEventListener('dragover', (e) => {
            e.preventDefault();
            const track = e.target.closest('.track');
            if (track) {
                document.querySelectorAll('.track').forEach(t => t.style.borderColor = '#333');
                track.style.borderColor = '#6366f1';
            }
        });

        elements.timeline.addEventListener('drop', async (e) => {
            e.preventDefault();
            document.querySelectorAll('.track').forEach(t => t.style.borderColor = '#333');

            // Unlocks audio context on drop interaction
            window.audioUnlocked = true;
            if (window.audioCtx && window.audioCtx.state === 'suspended') {
                window.audioCtx.resume();
            }

            const track = e.target.closest('.track');
            if (!track) return;

            const jsonData = e.dataTransfer.getData('application/json');
            const files = e.dataTransfer.files;
            let itemsToProcess = [];

            if (files && files.length > 0) {
                // Drop de arquivos externos (OS) - Ordenados por data de modificação (Crescente)
                const sortedFiles = Array.from(files).sort((a, b) => a.lastModified - b.lastModified);

                showToast(`Fazendo upload de ${sortedFiles.length} arquivo(s)...`, 'info');

                for (const file of sortedFiles) {
                    const localUrl = URL.createObjectURL(file);

                    // Upload automático ao dropar na timeline
                    const m = await import('./modules/uploader.js').catch(err => { alert("Erro ao carregar uploader: " + err.message); return null; });
                    if (!m) return;
                    const serverFilename = await m.uploadMedia(file);

                    if (serverFilename) {
                        const serverUrl = `uploads/${serverFilename}`;
                        itemsToProcess.push({
                            url: localUrl, // Local para browser
                            serverUrl: serverUrl, // Servidor para FFmpeg
                            type: file.type,
                            name: file.name
                        });
                        addToLibrary(file.name, localUrl, file.type, serverUrl);
                    } else {
                        // Fallback se upload falhar (mantém blob mas avisa)
                        itemsToProcess.push({ url: localUrl, type: file.type, name: file.name });
                        addToLibrary(file.name, localUrl, file.type);
                    }
                }
            } else if (jsonData) {
                // Drop da biblioteca interna (já tem serverUrl se foi feito upload)
                try {
                    const data = JSON.parse(jsonData);
                    itemsToProcess.push({
                        url: data.url,
                        serverUrl: data.serverUrl,
                        type: data.type,
                        name: data.name || "Clip"
                    });
                } catch (err) { /* fallback */ }
            }

            // Processar arquivos de projeto ou mídias
            const projectFileList = Array.from(files || []).filter(f => f.name.endsWith('.xml') || f.name.endsWith('.prproj'));

            if (projectFileList.length > 0) {
                importProject(projectFileList[0]);
                return; // Prioridade para projeto
            }

            try {
                if (itemsToProcess.length === 0) {
                    const plainSrc = e.dataTransfer.getData('text/plain');
                    const isUrlPattern = plainSrc && plainSrc.match(/^(blob:|data:|http|https|assets\/|C:|D:|\/)/i);
                    const isUiText = plainSrc && (plainSrc.includes('Studio Live-PRO') || plainSrc.includes('Exportar') || plainSrc.includes('◀'));

                    if (plainSrc && isUrlPattern && !isUiText) {
                        itemsToProcess.push({ url: plainSrc, type: 'video/mp4', name: "Clip" });
                    }
                }

                if (itemsToProcess.length === 0 && files.length === 0) {
                    showToast('Arquivo não suportado ou inválido.', 'error');
                    return;
                }

                // Posição inicial do drop
                const rect = track.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                let currentStartTime = Math.max(0, offsetX / state.pxPerSecond);

                for (const item of itemsToProcess) {
                    const { url: src, serverUrl, type, name } = item;
                    const isVideo = type.includes('video');
                    const isAudio = type.includes('audio');

                    takeSnapshot();

                    let duration = 10;
                    try {
                        const metaPromise = getFastMetadata(src, type);
                        const meta = await Promise.race([
                            metaPromise,
                            new Promise(r => setTimeout(() => r({ duration: 10 }), 500))
                        ]);
                        duration = meta.duration || 10;
                    } catch (err) { }

                    // Adiciona o clipe principal (Vídeo/Áudio)
                    addClipToState(src, currentStartTime, type, duration, track.id, {
                        name,
                        serverSrc: serverUrl || null
                    });

                    // Se for VÍDEO, extrai áudio e separa os canais
                    if (isVideo) {
                        const audioA = state.tracks.find(t => t.id === 'audio-a');
                        const audioB = state.tracks.find(t => t.id === 'audio-b');

                        if (audioA) {
                            addClipToState(src, currentStartTime, 'audio', duration, audioA.id, {
                                channel: 'left',
                                name: 'Audio L',
                                serverSrc: serverUrl || null
                            });
                        }

                        if (audioB) {
                            addClipToState(src, currentStartTime, 'audio', duration, audioB.id, {
                                channel: 'right',
                                name: 'Audio R',
                                serverSrc: serverUrl || null
                            });
                        }
                    }

                    // Carrega prévia se for o primeiro
                    if (isVideo && elements.previewVideo && !elements.previewVideo.src) {
                        elements.previewVideo.src = src;
                        elements.previewVideo.load();
                    }

                    currentStartTime += duration;
                }

                // Força renderização imediata e completa (ignora bloqueio de playback)
                window.forceRender = true;
                throttledRender();
                saveState();
                updateTimeClock();
                showToast('Mídia importada com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao importar recurso:', error);
                showToast('Erro ao importar arquivo de mídia.', 'error');
            }
        });

        elements.timeline.addEventListener('click', (e) => {
            // Delegação de eventos para botões dinâmicos
            if (e.target.id === 'btnAddTrack') {
                addTrackToState('video');
                renderTimeline(elements.timeline, state.pxPerSecond);
                return;
            }

            const time = updateVideoTimeFromClick(e, elements.timeline, elements.previewVideo, state.pxPerSecond);
            seekTo(time);
        });

        // Otimização: Só bloqueamos o scroll (passive: false) se o usuário estiver usando zoom (Ctrl/Alt)
        const onWheel = (e) => {
            if (e.ctrlKey || e.altKey) {
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.11;
                const newZoom = Math.max(0.1, Math.min(10000, state.pxPerSecond * zoomFactor));

                if (Math.abs(state.pxPerSecond - newZoom) < 0.01) return;

                state.pxPerSecond = newZoom;

                // Feedback visual imediato do slider se existir
                const zoomSlider = document.getElementById('zoomSlider');
                if (zoomSlider) {
                    const minZoom = 0.1;
                    const maxZoom = 10000;
                    const percent = Math.log(state.pxPerSecond / minZoom) / Math.log(maxZoom / minZoom);
                    zoomSlider.value = Math.max(1, Math.min(100, percent * 100));
                }

                throttledRender();
            }
        };

        // NOTA: Usamos passive: false apenas porque o Editor de Vídeo exige preventDefault no zoom.
        // Chrome reporta Violation, mas é o comportamento esperado para esta aplicação profissional.
        elements.timeline.addEventListener('wheel', onWheel, { passive: false });

        const btnMarker = document.getElementById('btnMarker');
        if (btnMarker) {
            btnMarker.addEventListener('click', async () => {
                const { addMarker } = await import('./modules/state.js');
                addMarker(globalTime);
            });
        }

        const btnBatchSplit = document.getElementById('btnBatchSplit');
        if (btnBatchSplit) {
            btnBatchSplit.addEventListener('click', async () => {
                const { batchSplitAtMarkers } = await import('./modules/state.js');
                batchSplitAtMarkers();
                showToast('Corte em lote concluído', 'success');
            });
        }
    }

    if (elements.previewVideo) {
        elements.previewVideo.addEventListener('timeupdate', () => {
            if (!isPlayingGlobal && !elements.playhead.classList.contains('dragging')) {
                // BUG FIX: O tempo do vídeo é LOCAL ao arquivo. Precisamos encontrar o clipe ativo 
                // e converter esse tempo local de volta para o tempo GLOBAL da timeline.
                const activeVideoClip = state.clips.find(c =>
                    c.type && c.type.includes('video') &&
                    elements.previewVideo.src === c.src &&
                    elements.previewVideo.currentTime >= (c.offset || 0) &&
                    elements.previewVideo.currentTime <= (c.offset || 0) + c.duration
                );

                if (activeVideoClip) {
                    const timeInClip = elements.previewVideo.currentTime - (activeVideoClip.offset || 0);
                    globalTime = activeVideoClip.start + timeInClip;
                } else {
                    // Fallback se não achar o clip (ex: espaço vazio)
                    // globalTime = elements.previewVideo.currentTime; // Removido por ser perigoso
                }

                updatePlayheadPosition(elements.playhead, globalTime, state.pxPerSecond);
                syncSecondaryAudios(globalTime, false);
                updateTimeClock();
            }
        });

        elements.previewVideo.addEventListener('loadeddata', () => {
            // Throttled render and scroll to globalTime
            throttledRender();
        }, { passive: true });
        if (elements.canvasWaveform) {
            const duration = getProjectDuration();
            elements.canvasWaveform.width = duration * state.pxPerSecond;
            drawWaveform(elements.previewVideo, elements.canvasWaveform);
        }

        elements.previewVideo.addEventListener('error', () => {
            const src = elements.previewVideo.src;
            if (src && src.startsWith('blob:')) {
                if (window.deadMediaSet) window.deadMediaSet.add(src);
                state.clips.forEach(c => { if (c.src === src) c.offline = true; });
                saveState();
                renderTimeline(elements.timeline, state.pxPerSecond);
            }
        });
    }
}

if (elements.btnAddText) elements.btnAddText.addEventListener('click', () => addTextOverlay(elements.overlayLayer, "Novo Texto"));
if (elements.btnAddLower) elements.btnAddLower.addEventListener('click', () => addTextOverlay(elements.overlayLayer, "Lower Third", true));


// Adição de trilha agora é tratada via delegação de eventos no elements.timeline (linha 487)

// ATALHOS DE TECLADO
window.addEventListener('keydown', async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Playback (Espaço)
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
        return;
    }

    // Selecionar Tudo (Ctrl+A)
    if (ctrl && key === 'a') {
        e.preventDefault();
        state.selectedClips = state.clips.map(c => c.id);
        state.selectedClipId = state.selectedClips[0] || null;
        throttledRender();
        showToast('Todos os clips selecionados', 'info');
        return;
    }

    // Blade / Split (C ou Ctrl+B)
    if ((key === 'c' && !ctrl) || (ctrl && key === 'b')) {
        e.preventDefault();
        takeSnapshot();
        const success = splitAtPlayhead(elements.timeline, state.pxPerSecond, globalTime);
        if (success) {
            history.addAction('split-clip', 'Corte realizado');
            showToast('Corte realizado', 'success');
        }
        return;
    }

    // Delete (Del ou Backspace)
    if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        if (state.selectedClipId) {
            takeSnapshot();
            deleteSelectedClip(elements.timeline, state.pxPerSecond);
            history.addAction('delete-clip', 'Clip removido');
            showToast('Clip removido', 'info');
        }
        return;
    }

    // Undo/Redo (Ctrl+Z / Ctrl+Y ou Ctrl+Shift+Z)
    if (ctrl && key === 'z') {
        e.preventDefault();
        if (shift) {
            if (history.redo()) throttledRender();
        } else {
            if (history.undo()) throttledRender();
        }
        return;
    }
    if (ctrl && key === 'y') {
        e.preventDefault();
        if (history.redo()) throttledRender();
        return;
    }

    // Navegação (Setas)
    if (key === 'arrowright') {
        e.preventDefault();
        seekTo(globalTime + (shift ? 1 : 1 / 30)); // 1s ou 1 frame
        return;
    }
    if (key === 'arrowleft') {
        e.preventDefault();
        seekTo(globalTime - (shift ? 1 : 1 / 30));
        return;
    }
    if (key === 'home') {
        e.preventDefault();
        seekTo(0);
        return;
    }

    // Ferramentas (V = Select, H = Hand)
    if (key === 'v') {
        e.preventDefault();
        activeTool = 'select';
        updateToolButtons();
        if (elements.timelineContainer) {
            elements.timelineContainer.style.cursor = 'default';
        }
        return;
    }
    if (key === 'h') {
        e.preventDefault();
        activeTool = 'hand';
        updateToolButtons();
        if (elements.timelineContainer) {
            elements.timelineContainer.style.cursor = 'grab';
        }
        return;
    }

    // Marcadores (M)
    if (key === 'm') {
        e.preventDefault();
        addMarker(globalTime);
        throttledRender();
        showToast(`Marcador adicionado em ${formatTime(globalTime)}`, 'success');
        return;
    }

    // Deleção (Delete ou Backspace)
    if (key === 'delete' || key === 'backspace') {
        const focused = document.activeElement;
        if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) return;

        const { deleteClip, rippleDelete } = await import('./modules/state.js');

        // RIPPLE DELETE (Shift + Delete)
        if (e.shiftKey) {
            let tracksToRipple = new Set();

            takeSnapshot(); // Snapshot único para a operação em lote

            if (state.selectedClips && state.selectedClips.length > 0) {
                state.selectedClips.forEach(id => {
                    const c = state.clips.find(clip => clip.id === id);
                    if (c) tracksToRipple.add(c.trackId);
                    deleteClip(id);
                });
                state.selectedClips = [];
                state.selectedClipId = null;
            } else if (state.selectedClipId) {
                const c = state.clips.find(clip => clip.id === state.selectedClipId);
                if (c) tracksToRipple.add(c.trackId);
                deleteClip(state.selectedClipId);
                state.selectedClipId = null;
            }

            // Aplica Ripple nas trilhas afetadas
            tracksToRipple.forEach(trackId => rippleDelete(trackId));

            showToast('Ripple Delete aplicado', 'success');
            return;
        }

        // DELEÇÃO COMUM
        if (state.selectedClips && state.selectedClips.length > 0) {
            takeSnapshot();
            state.selectedClips.forEach(id => deleteClip(id));
            state.selectedClips = [];
        } else if (state.selectedClipId) {
            takeSnapshot();
            deleteClip(state.selectedClipId);
        }
        return;
    }

    // Zoom (+ / -)
    if (key === '+' || key === '=') {
        e.preventDefault();
        state.pxPerSecond = Math.min(10000, state.pxPerSecond * 1.5);
        throttledRender();
        return;
    }
    if (key === '-' || key === '_') {
        e.preventDefault();
        state.pxPerSecond = Math.max(0.1, state.pxPerSecond * 0.7);
        throttledRender();
        return;
    }

    // Menu Shortcuts (Ctrl + N, S, I, O, R, Shift+S)
    if (ctrl) {
        if (key === 'n') {
            e.preventDefault();
            document.getElementById('menuNew')?.click();
        } else if (key === 'o') {
            e.preventDefault();
            document.getElementById('menuAbrir')?.click();
        } else if (key === 's') {
            e.preventDefault();
            if (shift) {
                document.getElementById('menuSalvarcomo')?.click();
            } else {
                saveState();
                showToast('Projeto Salvo', 'success');
            }
        } else if (key === 'i') {
            e.preventDefault();
            elements.mediaInput?.click();
        } else if (key === 'r') {
            e.preventDefault();
            const projectName = document.getElementById('projectName');
            if (projectName) {
                projectName.focus();
                projectName.select();
                showToast('Modo de Renomeação', 'info', 1000);
            }
        }
    }
});

// === SEARCH & REPLACE LOGIC ===
const btnApplyReplace = document.getElementById('btnApplyReplace');
const inputSearch = document.getElementById('searchQuery');
const inputReplace = document.getElementById('replaceQuery');

if (btnApplyReplace && inputSearch && inputReplace) {
    btnApplyReplace.addEventListener('click', () => {
        const findText = inputSearch.value;
        const replaceText = inputReplace.value;

        if (!findText) {
            showToast('Digite o texto a ser localizado', 'info');
            return;
        }

        takeSnapshot();
        let count = 0;

        // Busca nos Overlays (Textos)
        state.overlays.forEach(overlay => {
            if (overlay.content && typeof overlay.content === 'string' && overlay.content.includes(findText)) {
                overlay.content = overlay.content.replaceAll(findText, replaceText);
                count++;
            }
        });

        if (count > 0) {
            saveState();
            events.dispatchEvent(new Event('render')); // Força re-render dos overlays
            showToast(`${count} ocorrência(s) substituída(s)`, 'success');
            history.addAction('search-replace', `Substituído: "${findText}" por "${replaceText}"`);
        } else {
            showToast('Nenhuma ocorrência encontrada', 'info');
        }
    });

    // Suporte ao Enter no input de busca para disparar a substituição (conforme jslog hint)
    [inputSearch, inputReplace].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                btnApplyReplace.click();
            }
        });
    });
}


// --- CONTROLE DE PLAYBACK CENTRALIZADO (MASTER CLOCK + AUTO-SCROLL) ---
function togglePlayback() {
    // Garante que o AudioContext esteja ativo ao dar Play
    if (window.audioCtx && window.audioCtx.state === 'suspended') {
        window.audioCtx.resume();
    }

    isPlayingGlobal = !isPlayingGlobal;
    if (isPlayingGlobal) {
        lastTime = performance.now();
        startPlaybackLoop();
        if (elements.previewVideo && elements.previewVideo.src) {
            // elements.previewVideo.muted = true; // REMOVIDO: User quer áudio do vídeo
            elements.previewVideo.play().catch(() => {
                // Se falhar o autoplay (política do browser), tentamos novamente no próximo frame
            });
        }
    } else {
        stopPlaybackLoop();
        if (elements.previewVideo) {
            elements.previewVideo.pause();
        }
        syncSecondaryAudios(globalTime, false);
    }
}

function startPlaybackLoop() {
    if (playbackRAF) cancelAnimationFrame(playbackRAF);

    // Cache de referências para evitar lookups no loop
    const video = elements.previewVideo;
    const playhead = elements.playhead;

    const loop = (now) => {
        if (!isPlayingGlobal) return;

        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // Throttle para atualizações pesadas (ex: 20fps em vez de 60fps para o que não é visualmente crítico)
        const frameCount = (window._frameCount || 0) + 1;
        window._frameCount = frameCount;

        // Busca duração (cacheado internamente no state.js)
        const projectDuration = getProjectDuration();

        // [REMOVIDO] Forçar mute causava falta de áudio no vídeo principal
        // if (video && !video.muted) video.muted = true;

        // CLIP-AWARE PLAYBACK (Cache ultra-rápido)
        if (!window.activeClipCache || globalTime < window.activeClipCache.start || globalTime > (window.activeClipCache.start + window.activeClipCache.duration)) {
            window.activeClipCache = state.clips.find(c =>
                c.type && c.type.includes('video') &&
                globalTime >= c.start &&
                globalTime <= (c.start + c.duration) &&
                !c.offline
            );
        }

        const activeVideoClip = window.activeClipCache;

        if (activeVideoClip && video) {
            const readyState = video.readyState;

            // Sincronização de FONTE otimizada
            if (video.getAttribute('data-src') !== activeVideoClip.src) {
                video.pause();
                video.setAttribute('data-src', activeVideoClip.src);
                video.src = activeVideoClip.src;
                video.muted = false; // GARANTE SOM (User Request)
                video.load();
                // Não retorna, deixa o próximo frame lidar com o load
            } else if (readyState >= 2) {
                const targetVideoTime = (activeVideoClip.offset || 0) + (globalTime - activeVideoClip.start);
                const drift = video.currentTime - targetVideoTime;

                // DRIFT CORRECTION (Smooth PlaybackRate) - Igual ao AudioPool
                if (Math.abs(drift) < 0.05) {
                    if (video.playbackRate !== 1.0) video.playbackRate = 1.0;
                } else if (Math.abs(drift) < 0.5) {
                    // Nudge suave (1.05x / 0.95x)
                    const rate = drift < 0 ? 1.05 : 0.95;
                    if (video.playbackRate !== rate) video.playbackRate = rate;
                } else {
                    // Hard seek para desvios grandes
                    video.currentTime = targetVideoTime;
                    video.playbackRate = 1.0;
                }

                if (video.paused && !video.ended) {
                    video.play().catch(() => { });
                }

                // --- PRE-LOAD DO PRÓXIMO CLIPE (BUFFER CACHE) ---
                if (readyState >= 3 && (activeVideoClip.start + activeVideoClip.duration - globalTime) < 3) {
                    // Se faltam menos de 3 segundos para o fim do clipe atual, busca o próximo
                    const nextClip = state.clips.find(c =>
                        c.type && c.type.includes('video') &&
                        c.start > activeVideoClip.start &&
                        !c.offline
                    );
                    if (nextClip && !window._nextVideoCache) {
                        window._nextVideoCache = document.createElement('video');
                        window._nextVideoCache.style.display = 'none';
                        window._nextVideoCache.muted = true; // SEMPRE MUTE NO PRELOAD
                        window._nextVideoCache.preload = 'auto';
                        window._nextVideoCache.src = nextClip.src;
                        window._nextVideoCache.load();

                        // Cleanup automático do cache após 5s se não for usado
                        setTimeout(() => {
                            if (window._nextVideoCache) {
                                window._nextVideoCache.src = "";
                                window._nextVideoCache.remove();
                                window._nextVideoCache = null;
                            }
                        }, 5000);
                    }
                }
            }
        } else if (video && !video.paused) {
            video.pause();
        }

        globalTime += delta;
        if (globalTime > projectDuration) {
            togglePlayback();
            globalTime = projectDuration;
        }

        // Sincronia de Áudio (Global) - Throttled (A cada 2 frames para menor carga de CPU)
        if (frameCount % 2 === 0) {
            syncSecondaryAudios(globalTime, isPlayingGlobal);
        }

        // --- ATUALIZAÇÕES VISUAIS (Batch) ---
        // Cachear layout periodicamente para evitar reflow em cada frame de animação
        if (!window._playbackLayout || frameCount % 30 === 0) {
            window._playbackLayout = {
                viewWidth: elements.timeline?.clientWidth || 800,
                scrollLeft: elements.timeline?.scrollLeft || 0
            };
        }
        updatePlayheadPosition(playhead, globalTime, state.pxPerSecond, true, window._playbackLayout);

        // Relógio e UI menos frequente
        if (frameCount % 10 === 0) {
            updateTimeClock();
        }

        playbackRAF = requestAnimationFrame(loop);
    };

    lastTime = performance.now();
    playbackRAF = requestAnimationFrame(loop);
}

function stopPlaybackLoop() {
    if (playbackRAF) {
        cancelAnimationFrame(playbackRAF);
        playbackRAF = null;
    }

    // GHOST BUSTER: Mata qualquer áudio/vídeo que não seja o main ou do pool
    document.querySelectorAll('video, audio').forEach(el => {
        const isPool = el.id.startsWith('pool-audio');
        const isMain = el.id === 'previewVideo'; // Ajustar ID se necessário

        // Se não for oficial, mata
        if (!isPool && !isMain) {
            el.pause();
            el.removeAttribute('src');
            el.load();
            el.remove();
        }
    });
}

async function getMediaDuration(src, type) {
    return new Promise((resolve) => {
        const temp = document.createElement(type.includes('audio') ? 'audio' : 'video');
        temp.style.display = 'none'; // Ensure invisible
        temp.muted = true; // SAFETY FORCE MUTE
        temp.src = src;

        const cleanup = () => {
            temp.pause();
            temp.removeAttribute('src'); // Clean way to stop load without "Invalid URI" warning
            temp.load(); // Force release
            temp.remove(); // Explicitly remove
        };

        temp.onloadedmetadata = () => {
            const d = temp.duration;
            cleanup();
            resolve(d || 10);
        };

        temp.onerror = () => {
            cleanup();
            resolve(10);
        };

        // Timeout de segurança
        setTimeout(() => {
            cleanup();
            resolve(10);
        }, 3000);
    });
}

// Cache persistente para elementos de áudio para evitar document.getElementById no loop
// --- AUDIO POOLING SYSTEM (ZERO-ALLOCATION) ---
const AUDIO_POOL_SIZE = 12;
const audioPool = [];
const audioPoolMap = new Map(); // clipId -> poolIndex

function initAudioPool() {
    // ROBUST DUPLICATE PREVENTION: Check both array and DOM
    if (audioPool.length > 0 || document.getElementById('pool-audio-0')) {
        return; // Pool already initialized
    }

    // AGGRESSIVE CLEANUP: Remove any orphaned pool elements from previous sessions
    for (let i = 0; i < 20; i++) { // Check up to 20 to catch any strays
        const orphan = document.getElementById(`pool-audio-${i}`);
        if (orphan) {
            orphan.pause();
            orphan.removeAttribute('src');
            orphan.remove();
        }
    }

    // Now create the fresh pool
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
        const audio = document.createElement('audio');
        audio.id = `pool-audio-${i}`;
        audio.style.display = 'none';
        audio.preload = 'auto'; // Importante para garantir buffer
        document.body.appendChild(audio);
        audioPool.push({
            el: audio,
            inUse: false,
            clipId: null,
            lastUsed: 0
        });
    }
}

// Inicializa o pool APENAS UMA VEZ (Chamado pelo init() principal)

function getFreeAudioNode() {
    // 1. Tentar achar um livre
    let node = audioPool.find(n => !n.inUse);

    // 2. Se não tiver, roubar o "menos recentemente usado" (LRU) que não esteja tocando
    if (!node) {
        // Ordena por lastUsed (menor = mais antigo)
        const candidates = audioPool.filter(n => n.el.paused).sort((a, b) => a.lastUsed - b.lastUsed);
        if (candidates.length > 0) {
            node = candidates[0];
            // Se estava em uso, desassocia do clip anterior
            if (node.clipId) {
                audioPoolMap.delete(node.clipId);
                node.inUse = false;
                node.clipId = null;
            }
        }
    }
    return node;
}

// Cache global para evitar filter() no loop
let _audioClipsCache = null;
let _clipsLastLength = -1;

function syncSecondaryAudios(mainTime, isPlaying) {
    // Otimização: Só refaz o filtro se o número de clips mudou
    if (!_audioClipsCache || _clipsLastLength !== state.clips.length) {
        _audioClipsCache = state.clips.filter(c => c.type && c.type.includes('audio') && !c.offline);
        _clipsLastLength = state.clips.length;
    }

    const audioClips = _audioClipsCache;
    const activeClipIds = new Set();
    const PRELOAD_WINDOW = 2.0; // Segundos para pre-carregar antes de tocar

    // NUCLEAR OPTION: Se há um vídeo ativo, MUTA TODO O POOL (Previne duplicação garantida)
    const hasActiveVideo = window.activeClipCache && window.activeClipCache.type && window.activeClipCache.type.includes('video');
    if (hasActiveVideo) {
        audioPool.forEach(node => {
            if (node.el && !node.el.paused) {
                node.el.pause();
                node.el.muted = true;
            }
        });
        return; // Não processa áudio secundário enquanto vídeo está ativo
    }

    // 1. Identificar clips que DEVEM estar ativos ou em pre-load
    audioClips.forEach(clip => {
        // CORREÇÃO DE ÁUDIO DUPLICADO (Robustez de Tipos):
        // Se este clip é o vídeo que já está tocando no player principal, não tocamos no pool.
        if (window.activeClipCache && String(window.activeClipCache.id) === String(clip.id)) {
            return;
        }

        const start = clip.start;
        const end = clip.start + clip.duration;
        const isPlayingRange = (mainTime >= start && mainTime <= end);
        const isPreloadRange = (mainTime < start && (start - mainTime) < PRELOAD_WINDOW);

        if (isPlayingRange || isPreloadRange) {
            activeClipIds.add(clip.id);

            // Verifica se já tem um player alocado
            let poolIndex = audioPoolMap.get(clip.id);
            let poolNode = null;

            if (poolIndex !== undefined) {
                poolNode = audioPool[poolIndex];
            } else {
                poolNode = getFreeAudioNode();
                if (poolNode) {
                    // SHADOW KILLER: Garante que ninguém mais use este node
                    if (poolNode.inUse) {
                        poolNode.el.pause();
                        poolNode.el.src = "";
                    }

                    poolNode.inUse = true;
                    poolNode.clipId = clip.id;
                    poolNode.lastUsed = performance.now();
                    audioPoolMap.set(clip.id, audioPool.indexOf(poolNode));

                    // Reset attributes
                    poolNode.el.removeAttribute('src'); // Força reset
                    poolNode.el.removeAttribute('data-src');
                    delete poolNode.el.dataset.src;

                    // PREVINE ERRO 404 (Empty Source)
                    if (clip.src) {
                        poolNode.el.load();
                    }
                }
            }

            if (poolNode) {
                poolNode.lastUsed = performance.now();
                const audioEl = poolNode.el;

                // Sincronização de Fonte (Só muda se necessário)
                // Usamos dataset para checking rápido sem acesso ao disco
                if (audioEl.dataset.src !== clip.src) {
                    audioEl.src = clip.src;
                    audioEl.dataset.src = clip.src;
                    audioEl.load();
                }

                // Sincronização de Tempo (Drift Correction com Pitch-Preserving)
                if (isPlayingRange) {
                    const targetTime = (clip.offset || 0) + (mainTime - start);
                    const drift = audioEl.currentTime - targetTime;

                    // 1. Drift Imperceptível (< 0.05s): Ignora (Deixa o áudio fluir)
                    if (Math.abs(drift) < 0.05) {
                        if (audioEl.playbackRate !== 1.0) audioEl.playbackRate = 1.0;
                    }
                    // 2. Drift Corrigível (0.05s - 0.5s): Ajusta velocidade (Nudge)
                    else if (Math.abs(drift) < 0.5) {
                        // Se está atrasado (drift < 0), acelera um pouco (1.05x)
                        // Se está adiantado (drift > 0), desacelera (0.95x)
                        const correctionRate = drift < 0 ? 1.05 : 0.95;
                        if (audioEl.playbackRate !== correctionRate) audioEl.playbackRate = correctionRate;
                    }
                    // 3. Drift Crítico (> 0.5s): Hard Seek (Necessário)
                    else {
                        audioEl.currentTime = targetTime;
                        audioEl.playbackRate = 1.0;
                    }

                    if (isPlaying) {
                        if (audioEl.paused && audioEl.readyState >= 2) {
                            // Tenta tocar, muda para playbackRate 1.0 se falhar algo
                            audioEl.play().catch(() => { audioEl.playbackRate = 1.0; });
                        }
                    } else if (!audioEl.paused) {
                        audioEl.pause();
                        audioEl.playbackRate = 1.0;
                    }
                } else if (isPreloadRange) {
                    // Preload: Mantém pausado e na posição correta
                    if (!audioEl.paused) audioEl.pause();
                    audioEl.playbackRate = 1.0;

                    if (Math.abs(audioEl.currentTime - (clip.offset || 0)) > 0.1) {
                        audioEl.currentTime = (clip.offset || 0);
                    }
                }
            }
        }
    });

    // 2. Cleanup: Desalocar players de clips que saíram do range
    audioPoolMap.forEach((poolIndex, clipId) => {
        if (!activeClipIds.has(clipId)) {
            const node = audioPool[poolIndex];
            if (node) {
                // SHADOW KILLER: reset total
                node.el.pause();
                node.el.removeAttribute('src'); // Remove fonte
                node.el.load(); // Solta o buffer
                node.inUse = false;
                node.clipId = null;
            }
            audioPoolMap.delete(clipId);
        }
    });
}

function setupRecorderModule() {
    if (elements.btnRecAudio && elements.btnRecVideo) {
        initRecorder(elements.btnRecAudio, elements.btnRecVideo, elements.camOverlay, elements.camPreview, elements.recTimer, elements.btnStopRec, async (name, url, type) => {
            const duration = await getMediaDuration(url, type);
            addClipToState(url, globalTime, type, duration);
            throttledRender();
            addToLibrary(name, url, type);
            updateTimeClock();
        });
    }
    // Note: File input handling is done via the drop event listener on the timeline
    // The uploader.js module is imported dynamically when needed for uploads
}


function addToLibrary(name, url, type, serverUrl = null) {
    if (!elements.mediaLibrary) return;

    // PERFORMANCE: Usar classe media-item padrão do projeto
    const item = document.createElement('div');
    item.className = 'media-item';
    item.draggable = true;
    item.dataset.url = url;
    item.dataset.type = type;
    item.dataset.name = name;
    if (serverUrl) item.dataset.serverUrl = serverUrl;

    const icon = type.includes('video') ? '🎬' : '🎵';
    item.innerHTML = `
        <span class="lib-icon">${icon}</span>
        <span class="lib-name" title="${name}">${name.length > 25 ? name.substring(0, 25) + '...' : name}</span>
    `;

    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            url, serverUrl, type, name
        }));
    });

    item.addEventListener('dblclick', () => {
        const timeline = document.getElementById('timeline');
        const scrollLeft = timeline ? timeline.scrollLeft : 0;
        const startTime = (scrollLeft + 100) / state.pxPerSecond;
        addClipToState(url, startTime, type, 10, null, { name, serverSrc: serverUrl });
        throttledRender();
    });

    elements.mediaLibrary.appendChild(item);
}

// Inicialização segura com pequeno delay para garantir que o DOM e o navegador estejam prontos
setTimeout(() => {
    try {
        init().catch(e => {
            alert("Erro ao inicializar o editor: " + e.message);
        });
    } catch (e) {
        alert("Erro síncrono crítico: " + e.message);
    }
}, 300);

// Empty State click to upload
if (elements.emptyState) {
    elements.emptyState.addEventListener('click', (e) => {
        if (e.target === elements.emptyState || e.target.classList.contains('empty-state-content')) {
            elements.mediaInput.click();
        }
    });
}

// Limpeza Automática de Sessão (Beacon API)
window.addEventListener('beforeunload', () => {
    navigator.sendBeacon('api/cleanup_session.php');
});

// Final do arquivo
