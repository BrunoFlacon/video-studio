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
    getInterpolatedTransform,
    updateProjectSettings,
    events
} from './modules/state.js';
import { showTransformPanel, triggerMirror, triggerAutoReframe, closeTransformPanel } from './modules/transform.js';
import { showCanvasToolbar, hideCanvasToolbar } from './modules/canvas-toolbar.js';
import { showResizeOverlay, hideResizeOverlay, applyClipTransformToPreview, updateResizeOverlay } from './modules/resize-handles.js';
import { renderTimeline, splitAtPlayhead, deleteSelectedClip } from './modules/timeline.js';
import { initPlayhead } from './modules/playhead.js';
import { drawWaveform, analyzeAudioChannels, getFastMetadata, initAudioPool, syncSecondaryAudios } from './modules/audio.js';
import { initRecorder } from './modules/recorder.js';
import { initExport } from './modules/export.js';
import { addTextOverlay } from './modules/text-layer.js';
import { showRecentProjectsModal, showSaveAsDialog, importProject, showToast, addToRecentProjects } from './modules/file-operations.js';
import { addLowerThird } from './modules/lower-third.js';
import { showEffectsPanel } from './modules/effects.js';
import { showPluginImportDialog } from './modules/plugin-import.js';
import { history } from './modules/history.js';
import { el, createSVG } from './modules/dom-utils.js';
import { tempCleanup } from './modules/temp-cleanup.js';

// --- SELEÇÃO DE ELEMENTOS (CENTRALIZADA) ---
const elements = {
    workspace: document.querySelector('.workspace'),
    previewVideo: document.getElementById('previewVideo'),
    timeDisplay: document.getElementById('timeDisplay'),
    overlayLayer: document.getElementById('overlayLayer'),
    timeline: document.getElementById('timeline'),
    videoTrack: document.getElementById('videoTrack'),
    audioTrack: document.getElementById('audio-a'),
    audioR: document.getElementById('audio-b'),
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
    timelineContainer: document.querySelector('.timeline-container'),
    toggleSidebar: document.getElementById('toggleSidebar'),
    sidebar: document.querySelector('.sidebar')
};

// Global state for playback
let playbackRAF = null;
let lastTime = 0;
let isPlayingGlobal = false;
let globalTime = 0;

// --- ESTADO DE FERRAMENTAS ---
let activeTool = 'select'; // 'select' ou 'hand'
window.selectedClips = new Set(); // Multi-seleção de clips

function togglePlayback() {
    isPlayingGlobal = !isPlayingGlobal;
    if (isPlayingGlobal) {
        lastTime = performance.now();
        playbackLoop();
        if (elements.previewVideo && elements.previewVideo.src) {
            elements.previewVideo.play().catch(e => console.warn("Video play blocked", e));
        }
    } else {
        if (playbackRAF) cancelAnimationFrame(playbackRAF);
        playbackRAF = null;
        if (elements.previewVideo) elements.previewVideo.pause();
        syncSecondaryAudios(globalTime, false);
    }
}

function playbackLoop() {
    if (!isPlayingGlobal) return;
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // Master Clock: Se houver um vídeo ativo, o tempo dele é a verdade absoluta
    const activeVideoTrack = elements.previewVideo && !elements.previewVideo.paused;

    if (activeVideoTrack) {
        // Encontra o clipe de vídeo atual no estado
        const activeVideoClip = state.clips.find(c =>
            c.type && c.type.includes('video') &&
            globalTime >= (c.start - 0.1) && globalTime <= (c.start + c.duration + 0.1) && !c.offline
        );

        if (activeVideoClip) {
            // Sincroniza o globalTime baseado na posição real do vídeo
            globalTime = activeVideoClip.start + (elements.previewVideo.currentTime - (activeVideoClip.offset || 0));
        } else {
            globalTime += dt;
        }
    } else {
        globalTime += dt;
    }

    // Looping de segurança
    const duration = getProjectDuration();
    if (globalTime > duration + 0.5) {
        globalTime = 0;
        if (elements.previewVideo) elements.previewVideo.currentTime = 0;
    }

    // Em vez de seekTo(completo), rodamos apenas o necessário para manter 60fps
    updatePlayheadPosition(elements.playhead, globalTime, state.pxPerSecond);
    syncSecondaryAudios(globalTime, isPlayingGlobal);
    updateTimeClock();

    playbackRAF = requestAnimationFrame(playbackLoop);
}

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
        // Canvas Toolbar + Resize Overlay
        if (state.selectedClipId) {
            showCanvasToolbar({
                onAutoReframe: (id) => triggerAutoReframe(id),
                onShowPanel: (id) => showTransformPanel(id)
            });
            showResizeOverlay(state.selectedClipId);
        } else {
            hideCanvasToolbar();
            hideResizeOverlay();
        }
        debouncedSave();
    });
};

let saveTimeout = null;
export const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveState();
    }, 1000);
};

async function init() {
    window.state = state;
    state.videoElement = elements.previewVideo;
    window.audioUnlocked = false;

    await loadState();

    if (history && history.stack.length === 0) {
        history.addAction('init', 'Estado Inicial');
    }

    initAudioPool();
    setupEventListeners();

    if (elements.btnCinemaMode) {
        elements.btnCinemaMode.addEventListener('click', () => {
            const isCinema = document.body.classList.toggle('cinema-mode');
            if (elements.previewVideo) {
                elements.previewVideo.classList.toggle('preview-cinema', isCinema);
            }

            if (isCinema) {
                elements.btnCinemaMode.replaceChildren(
                    createSVG('0 0 24 24', [
                        'M18 6H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3ZM6 8h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z',
                        'M9.086 4.43 12 1.518l2.914 2.912 1.414-1.413L12.06-.251a1.5 1.5 0 0 0-2.121 0L6.67 3.017l1.414 1.414Z'
                    ], { width: 20, height: 20, fill: 'currentColor' })
                );
                elements.btnCinemaMode.title = "Restaurar Timeline";
                elements.btnCinemaMode.classList.add('active');
            } else {
                elements.btnCinemaMode.replaceChildren(
                    createSVG('0 0 24 24', [
                        'M18 6H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3ZM6 8h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z',
                        'M14.914 19.5 12 22.412 9.086 19.5 7.67 20.913l3.268 3.268a1.5 1.5 0 0 0 2.121 0l3.268-3.268-1.414-1.414Z'
                    ], { width: 20, height: 20, fill: 'currentColor' })
                );
                elements.btnCinemaMode.title = "Minimizar Timeline (Cinema Mode)";
                elements.btnCinemaMode.classList.remove('active');
            }

            setTimeout(() => {
                if (window.onResize) window.onResize();
            }, 300);
        });
    }

    if (elements.toggleSidebar && elements.sidebar) {
        elements.toggleSidebar.addEventListener('click', () => {
            const isHidden = elements.sidebar.classList.toggle('collapsed');
            elements.toggleSidebar.textContent = isHidden ? '▶' : '◀';
            elements.toggleSidebar.title = isHidden ? 'Mostrar Sidebar' : 'Ocultar Sidebar';
            elements.toggleSidebar.classList.toggle('active', isHidden);

            setTimeout(() => {
                if (window.onResize) window.onResize();
                document.dispatchEvent(new Event('render'));
            }, 300);
        });
    }

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

    const btnSmart = document.getElementById('btnSmartReframe');
    if (btnSmart) {
        btnSmart.addEventListener('click', () => {
            if (state.selectedClipId) triggerAutoReframe(state.selectedClipId);
            else showToast('Selecione um clipe primeiro', 'warning');
        });
    }

    const btnMirror = document.getElementById('btnMirror');
    if (btnMirror) {
        btnMirror.addEventListener('click', () => {
            if (state.selectedClipId) triggerMirror(state.selectedClipId);
            else showToast('Selecione um clipe primeiro', 'warning');
        });
    }

    if (elements.btnUndo) {
        elements.btnUndo.addEventListener('click', () => {
            if (history.undo()) {
                throttledRender();
                updateUndoRedoButtons();
            }
        });
    }

    if (elements.btnRedo) {
        elements.btnRedo.addEventListener('click', () => {
            if (history.redo()) {
                throttledRender();
                updateUndoRedoButtons();
            }
        });
    }

    if (elements.selectPreset) {
        elements.selectPreset.addEventListener('change', (e) => {
            const val = e.target.value;
            let w = 1920, h = 1080;
            switch (val) {
                case 'hd': w = 1280; h = 720; break;
                case '4k': w = 3840; h = 2160; break;
                case 'vertical': w = 1080; h = 1920; break;
                case 'square': w = 1080; h = 1080; break;
            }
            updateProjectSettings({ width: w, height: h });
        });
    }

    updateToolButtons();
    updateUndoRedoButtons();

    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            setupRecorderModule();
            requestIdleCallback(() => {
                initExport(elements.btnExport, elements.selectPreset);
                requestIdleCallback(() => autoLoadFirstVideo());
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

    const zoomSlider = document.getElementById('zoomSlider');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const minZoom = 0.1, maxZoom = 10000;
            const percent = value / 1000;
            state.pxPerSecond = minZoom * Math.pow(maxZoom / minZoom, percent);
            if (!window.isRendering) {
                window.requestAnimationFrame(() => {
                    renderTimeline(elements.timeline, state.pxPerSecond);
                    updatePlayheadPosition(elements.playhead, globalTime, state.pxPerSecond, false);
                });
            }
        }, { passive: true });
    }

    events.addEventListener('render', () => {
        if (elements.timeline) requestAnimationFrame(() => renderTimeline(elements.timeline, state.pxPerSecond));
        if (state.projectSettings) {
            updatePreviewAspectRatio(state.projectSettings.width, state.projectSettings.height);
        }
        setTimeout(() => seekTo(globalTime), 10);
    });

    events.addEventListener('settingsChanged', (e) => {
        const settings = e.detail;
        if (settings) {
            updatePreviewAspectRatio(settings.width, settings.height);
            throttledRender();
        }
    });

    if (elements.timeline) {
        elements.timeline.addEventListener('scroll', () => {
            if (!renderRAF) throttledRender();
        }, { passive: true });
    }

    document.addEventListener('historyChanged', () => updateUndoRedoButtons());

    if (elements.timeline) renderTimeline(elements.timeline, state.pxPerSecond);

    if (elements.playhead && elements.timeline) {
        initPlayhead(elements.playhead, elements.timeline, (relX) => {
            seekTo(relX / state.pxPerSecond);
        });
    }

    updateTimeClock();
    autoLoadFirstVideo();

    if (elements.previewVideo) {
        elements.previewVideo.addEventListener('play', () => {
            if (!isPlayingGlobal) {
                isPlayingGlobal = true;
                lastTime = performance.now();
                playbackLoop();
            }
        });
        elements.previewVideo.addEventListener('pause', () => {
            if (isPlayingGlobal) {
                isPlayingGlobal = false;
                if (playbackRAF) cancelAnimationFrame(playbackRAF);
                playbackRAF = null;
                syncSecondaryAudios(globalTime, false);
            }
        });
    }

    const unlockAudio = async () => {
        window.audioUnlocked = true;
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.audioCtx.state === 'suspended') await window.audioCtx.resume();
        if (elements.timeline) requestAnimationFrame(() => renderTimeline(elements.timeline, state.pxPerSecond));
        ['mousedown', 'keydown', 'touchstart'].forEach(ev => window.removeEventListener(ev, unlockAudio));
    };
    ['mousedown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true }));
}

function setupRecorderModule() {
    if (elements.btnRecAudio && elements.btnRecVideo) {
        initRecorder(
            elements.btnRecAudio,
            elements.btnRecVideo,
            elements.camOverlay,
            elements.camPreview,
            elements.recTimer,
            elements.btnStopRec,
            (name, url, type) => addToLibrary(name, url, type)
        );
    }
}

function autoLoadFirstVideo() {
    if (!elements.previewVideo || elements.previewVideo.src) return;
    const firstVideo = state.clips.find(c => c.type.includes('video') && !c.offline);
    if (firstVideo) {
        elements.previewVideo.src = firstVideo.src;
        elements.previewVideo.muted = true;
        elements.previewVideo.load();
    }
}

function seekTo(time) {
    if (isNaN(time)) time = 0;
    globalTime = Math.max(0, time);
    const activeVideoClip = state.clips.find(c =>
        c.type && c.type.includes('video') &&
        globalTime >= c.start && globalTime <= (c.start + c.duration) && !c.offline
    );

    if (elements.previewVideo && activeVideoClip) {
        if (elements.previewVideo.src !== activeVideoClip.src) {
            elements.previewVideo.src = activeVideoClip.src;
            elements.previewVideo.load();
        }

        // Aplica Mute e Volume do clipe (Respeita separação de áudio)
        elements.previewVideo.muted = !!activeVideoClip.muted;
        elements.previewVideo.volume = activeVideoClip.volume !== undefined ? activeVideoClip.volume : 1.0;
        const { scale, rotate, x, y, opacity, blendMode, flipH, flipV } = getInterpolatedTransform(activeVideoClip, globalTime);
        let transformCSS = `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;
        if (flipH) transformCSS += ' scaleX(-1)';
        if (flipV) transformCSS += ' scaleY(-1)';
        elements.previewVideo.style.transform = transformCSS;
        elements.previewVideo.style.opacity = opacity;
        elements.previewVideo.style.mixBlendMode = blendMode;
        const targetVideoTime = (activeVideoClip.offset || 0) + (globalTime - activeVideoClip.start);
        if (Math.abs(elements.previewVideo.currentTime - targetVideoTime) > 0.3) {
            elements.previewVideo.currentTime = targetVideoTime;
        }
    } else if (elements.previewVideo) {
        elements.previewVideo.style.transform = '';
        elements.previewVideo.style.opacity = '1';
        elements.previewVideo.style.mixBlendMode = 'normal';
    }

    updatePlayheadPosition(elements.playhead, globalTime, state.pxPerSecond);
    syncSecondaryAudios(globalTime, isPlayingGlobal);
    updateTimeClock();
}

function updateTimeClock() {
    if (elements.timeDisplay) {
        elements.timeDisplay.textContent = `${formatTime(globalTime)} / ${formatTime(getProjectDuration())}`;
    }
}

function setupEventListeners() {
    const btnImportMedia = document.getElementById('btnImportMedia');
    if (btnImportMedia) btnImportMedia.addEventListener('click', () => elements.mediaInput.click());

    if (elements.mediaInput) {
        elements.mediaInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files).sort((a, b) => a.lastModified - b.lastModified);
            for (const file of files) {
                const localUrl = URL.createObjectURL(file);
                addToLibrary(file.name, localUrl, file.type);
                import('./modules/uploader.js').then(async (m) => {
                    const result = await m.uploadMedia(file);
                    if (result?.filename) {
                        const serverUrl = `uploads/${result.filename}`;
                        state.clips.forEach(c => { if (c.src === localUrl) c.serverSrc = serverUrl; });
                        const libItem = Array.from(document.querySelectorAll('.media-item')).find(i => i.dataset.url === localUrl);
                        if (libItem) libItem.dataset.serverUrl = serverUrl;
                        saveState();
                        showToast(`Upload concluído: ${file.name}`, 'success', 1000);
                    }
                });
            }
            elements.mediaInput.value = '';
        });
    }

    document.querySelectorAll('.menu-section-header, .section-toggle').forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            let section = header.classList.contains('section-toggle') ? document.getElementById(header.dataset.target) : (header.closest('.menu-section') || header.parentElement);
            if (!section) return;
            section.classList.toggle('collapsed');
            if (header.classList.contains('section-toggle')) header.setAttribute('aria-expanded', !section.classList.contains('collapsed'));
            if (!section.classList.contains('collapsed')) {
                Array.from(section.parentElement.children).forEach(s => {
                    if (s !== section && s.classList.contains('menu-section')) {
                        s.classList.add('collapsed');
                        const t = s.querySelector('.section-toggle') || document.querySelector(`[data-target="${s.id}"]`);
                        if (t) t.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });
    });

    const menuActions = {
        'menuNew': () => import('./modules/sequence-settings-mod.js').then(m => m.showSequenceSettings()),
        'menuSave': () => { saveState(); showToast('Projeto Salvo', 'success'); },
        'menuImport': () => elements.mediaInput?.click(),
        'menuRename': () => { const i = document.getElementById('projectName'); if (i) setTimeout(() => { i.focus(); i.select(); }, 50); },
        'menuAbrir': () => document.getElementById('projectInput')?.click(),
        'menuAbrirRecentes': () => showRecentProjectsModal(),
        'menuSalvarcomo': () => showSaveAsDialog(),
        'menuSequence': () => import('./modules/sequence-settings-mod.js').then(m => m.showSequenceSettings()),
        'menuPlugins': () => showPluginImportDialog(),
        'btnAddEfeitos': () => showEffectsPanel(),
        'btnHistorico': () => history.showHistoryPanel()
    };
    Object.entries(menuActions).forEach(([id, action]) => document.getElementById(id)?.addEventListener('click', action));

    document.getElementById('projectName')?.addEventListener('change', (e) => {
        document.title = e.target.value.replace('.xml', '') + ' - Studio Live-PRO';
        saveState();
        addToRecentProjects(e.target.value);
    });

    document.getElementById('projectInput')?.addEventListener('change', async (e) => {
        if (e.target.files[0]) { await importProject(e.target.files[0]); e.target.value = ''; }
    });

    const toolActions = {
        'toolSplit': () => { takeSnapshot(); if (splitAtPlayhead(elements.timeline, state.pxPerSecond, globalTime)) history.addAction('split-clip', 'Corte'); },
        'btnCutTimeline': () => { takeSnapshot(); if (splitAtPlayhead(elements.timeline, state.pxPerSecond, globalTime)) history.addAction('split-clip', 'Corte'); },
        'toolDelete': () => { if (state.selectedClipId) { takeSnapshot(); deleteClip(state.selectedClipId); history.addAction('delete-clip', 'Removido'); } },
        'btnDeleteClip': () => { takeSnapshot(); deleteSelectedClip(elements.timeline, state.pxPerSecond); }
    };
    Object.entries(toolActions).forEach(([id, action]) => document.getElementById(id)?.addEventListener('click', action));

    document.getElementById('btnAddLower')?.addEventListener('click', () => { addLowerThird(); history.addAction('lower-third', 'Lower Third'); });
    document.getElementById('btnAddPreset')?.addEventListener('click', () => import('./modules/presets.js').then(m => m.showPresetsPanel()));
    document.getElementById('btnSnap')?.addEventListener('click', (e) => { state.snapEnabled = !state.snapEnabled; e.currentTarget.classList.toggle('active', state.snapEnabled); });

    if (elements.timeline) {
        elements.timeline.addEventListener('dragover', (e) => e.preventDefault());
        elements.timeline.addEventListener('drop', async (e) => {
            e.preventDefault();
            const track = e.target.closest('.track');
            if (!track) return;
            const data = e.dataTransfer.getData('application/json');
            const files = e.dataTransfer.files;
            let items = [];
            if (files?.length) {
                for (const f of Array.from(files).sort((a, b) => a.lastModified - b.lastModified)) {
                    const url = URL.createObjectURL(f);
                    const m = await import('./modules/uploader.js');
                    const res = await m.uploadMedia(f);
                    const sUrl = res?.filename ? `uploads/${res.filename}` : null;
                    items.push({ url, serverUrl: sUrl, type: f.type, name: f.name });
                    addToLibrary(f.name, url, f.type, sUrl);
                }
            } else if (data) {
                const d = JSON.parse(data);
                items.push({ url: d.url, serverUrl: d.serverUrl, type: d.type, name: d.name });
            }
            const rect = track.getBoundingClientRect();
            let start = Math.max(0, (e.clientX - rect.left) / state.pxPerSecond);
            for (const item of items) {
                takeSnapshot();
                const meta = await getFastMetadata(item.url, item.type).catch(() => ({ duration: 10 }));
                const dur = meta.duration || 10;

                // Restaura o comportamento de separação L/R automática ao dropar vídeo
                // Mesmo se dropar em uma track de áudio, tratamos como composição (Vídeo + Áudio L + Áudio R)
                if (item.type.includes('video')) {
                    // Adiciona o clipe de VÍDEO na primeira trilha de vídeo ou na trilha alvo se for de vídeo
                    let videoTrackId = track.dataset.type === 'video' ? track.id : 'videoTrack';

                    // IMPORTANTE: O clipe de VÍDEO entra MUTADO se houver tracks de áudio separadas
                    addClipToState(item.url, start, item.type, dur, videoTrackId, {
                        name: item.name,
                        serverSrc: item.serverUrl,
                        muted: true,
                        volume: 0
                    });

                    // Adiciona Canal ESQUERDO na trilha ÁUDIO A (id: audio-a)
                    addClipToState(item.url, start, 'audio', dur, 'audio-a', {
                        name: item.name + ' (L)',
                        serverSrc: item.serverUrl,
                        channel: 'left'
                    });

                    // Adiciona Canal DIREITO na trilha ÁUDIO R (id: audio-b)
                    addClipToState(item.url, start, 'audio', dur, 'audio-b', {
                        name: item.name + ' (R)',
                        serverSrc: item.serverUrl,
                        channel: 'right'
                    });
                } else {
                    // Se dropar áudio ou outro tipo, insere na trilha onde soltou
                    addClipToState(item.url, start, item.type, dur, track.id, { name: item.name, serverSrc: item.serverUrl });
                }

                start += dur;
            }
            throttledRender();
            saveState();
        });

        elements.timeline.addEventListener('click', (e) => {
            if (e.target.id === 'btnAddTrack') { addTrackToState('video'); throttledRender(); }
            else seekTo(updateVideoTimeFromClick(e, elements.timeline, elements.previewVideo, state.pxPerSecond));
        });

        elements.timeline.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.altKey) {
                if (e.cancelable) e.preventDefault();
                state.pxPerSecond = Math.max(0.1, Math.min(10000, state.pxPerSecond * (e.deltaY > 0 ? 0.9 : 1.11)));
                const s = document.getElementById('zoomSlider');
                if (s) {
                    const min = 0.1, max = 10000;
                    s.value = Math.log(state.pxPerSecond / min) / Math.log(max / min) * 100;
                }
                throttledRender();
            }
        }, { passive: false });
    }

    document.getElementById('btnMarker')?.addEventListener('click', async () => {
        const { addMarker } = await import('./modules/state.js');
        addMarker(globalTime);
    });

    // --- TECLAS DE ATALHO (KEYBOARD SHORTCUTS) ---
    window.addEventListener('keydown', (e) => {
        // Ignora se estiver digitando em um input
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        switch (e.key) {
            case ' ': // Space: Play/Pause
                e.preventDefault();
                togglePlayback();
                break;
            case 'c':
            case 'C': // Split
                takeSnapshot();
                if (splitAtPlayhead(elements.timeline, state.pxPerSecond, globalTime)) {
                    history.addAction('split-clip', 'Corte');
                }
                break;
            case 'Delete':
            case 'Backspace': // Delete Selected
                if (state.selectedClipId) {
                    takeSnapshot();
                    deleteClip(state.selectedClipId);
                    history.addAction('delete-clip', 'Removido');
                }
                break;
            case 's':
            case 'S': // Toggle Snap
                state.snapEnabled = !state.snapEnabled;
                document.getElementById('btnSnap')?.classList.toggle('active', state.snapEnabled);
                break;
            case 'z':
            case 'Z': // Undo/Redo
                if (e.ctrlKey || e.metaKey) {
                    if (e.shiftKey) history.redo();
                    else history.undo();
                    throttledRender();
                    updateUndoRedoButtons();
                }
                break;
        }
    });
}

function updatePreviewAspectRatio(w, h) {
    const container = document.querySelector('.preview-container');
    if (!container) return;
    container.style.setProperty('--project-width', w);
    container.style.setProperty('--project-height', h);
    container.classList.toggle('is-vertical', h > w);

    let stage = container.querySelector('.preview-stage');
    if (!stage) {
        stage = document.createElement('div');
        stage.className = 'preview-stage';
        if (elements.previewVideo) stage.appendChild(elements.previewVideo);
        container.appendChild(stage);
        container.classList.add('has-stage');
    }

    const maxW = container.clientWidth, maxH = container.clientHeight;
    const ratio = w / h;
    let sW = maxW, sH = maxW / ratio;
    if (sH > maxH) { sH = maxH; sW = maxH * ratio; }
    stage.style.width = sW + 'px';
    stage.style.height = sH + 'px';
    if (elements.previewVideo) {
        elements.previewVideo.style.width = '100%';
        elements.previewVideo.style.height = '100%';
        elements.previewVideo.style.objectFit = 'contain';
    }
    updateResizeOverlay();
}

function addToLibrary(name, url, type, serverUrl = null) {
    if (!elements.mediaLibrary) return;
    const item = el('div', { className: 'media-item', draggable: true });
    item.dataset.url = url;
    item.dataset.type = type;
    item.dataset.name = name;
    if (serverUrl) item.dataset.serverUrl = serverUrl;

    const icon = type.includes('video') ? '🎬' : '🎵';
    item.appendChild(el('span', { className: 'lib-icon', textContent: icon }));
    item.appendChild(el('span', { className: 'lib-name', title: name, textContent: name.length > 25 ? name.substring(0, 25) + '...' : name }));

    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            url: item.dataset.url, serverUrl: item.dataset.serverUrl || null, type, name
        }));
    });

    item.addEventListener('dblclick', () => {
        const start = ((elements.timeline?.scrollLeft || 0) + 100) / state.pxPerSecond;
        addClipToState(item.dataset.url, start, type, 10, null, { name, serverSrc: item.dataset.serverUrl || null });
        throttledRender();
    });

    elements.mediaLibrary.appendChild(item);
}

setTimeout(() => {
    init().catch(e => console.error("Erro ao inicializar:", e));
}, 300);

window.addEventListener('beforeunload', () => navigator.sendBeacon('api/cleanup_session.php'));
