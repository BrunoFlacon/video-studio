// state.js

// Estado Único da Verdade
export const state = {
    clips: [], // Array de dados dos clips
    tracks: [
        { id: 'video-1', type: 'video', name: 'Vídeo 1' },
        { id: 'audio-a', type: 'audio', name: 'Áudio A' },
        { id: 'audio-b', type: 'audio', name: 'Áudio B' }
    ],
    duration: 60, // Duração total do projeto em segundos
    zoom: 1, // Zoom level
    selectedClipId: null, // ID do clip selecionado
    videoElement: null, // Referência ao player de vídeo principal
    pxPerSecond: 100, // Zoom da timeline (ajustado para o padrão do editor.js)
    overlays: [], // Camadas de texto/imagem
    projectSettings: {
        width: 1920,
        height: 1080,
        fps: 30,
        sampleRate: 44100,
        explorer: 'native'
    },
    markers: [], // Array de tempos (segundos) dos marcadores
    selectedClips: [] // IDs para seleção múltipla
};

// Função auxiliar para forçar atualização da UI (padrão Observer simples)
export const events = new EventTarget();
export function notifyChange(event = 'render') {
    events.dispatchEvent(new Event(event));
}

export function takeSnapshot() {
    // Proxy para o history manager se necessário, ou placeholder
    // Na arquitetura atual, events.dispatchEvent('snapshot') poderia ser ouvido pelo history.js
}

// ==== PERSISTENCE ====

export function saveState() {
    const data = {
        clips: state.clips,
        tracks: state.tracks,
        duration: state.duration,
        zoom: state.zoom,
        overlays: state.overlays,
        markers: state.markers,
        pxPerSecond: state.pxPerSecond,
        projectSettings: state.projectSettings,
        savedAt: Date.now()
    };

    const dataString = JSON.stringify(data);

    // Otimização: Só salva se houve mudança real desde o último save
    if (window._lastSavedHash === dataString) return;
    window._lastSavedHash = dataString;

    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            try {
                localStorage.setItem('live_cut_project', dataString);
            } catch (e) {
                // Silently fail or handle quota errors
            }
        });
    } else {
        localStorage.setItem('live_cut_project', dataString);
    }
}

export function loadState(data) {
    if (!data) {
        const saved = localStorage.getItem('live_cut_project');
        if (saved) data = JSON.parse(saved);
    }

    if (data) {
        // Blobs não persistem entre sessões, então qualquer um vindo do storage está morto.
        // Marcamos proativamente como offline para evitar erros de rede (ERR_FILE_NOT_FOUND).
        state.clips = (data.clips || []).map(clip => {
            // Se o src for inválido (como texto da UI acidentalmente arrastado), marcamos como offline
            // O erro 403 ocorria porque o "texto" da UI era tratado como URL.
            const isInvalidSrc = !clip.src ||
                (typeof clip.src === 'string' && (
                    clip.src.includes('Studio Live-PRO') ||
                    clip.src.includes('Exportar') ||
                    !clip.src.match(/^(blob:|data:|http|https|assets\/|C:|D:|\/)/i)
                ));

            if (isInvalidSrc || (clip.src && clip.src.startsWith('blob:'))) {
                return { ...clip, offline: true, src: isInvalidSrc ? '' : clip.src };
            }
            return clip;
        }).filter(clip => clip.src !== ''); // Remove clips que não tem fonte válida e não são blobs temporários


        state.tracks = data.tracks || state.tracks;
        state.duration = data.duration || 60;
        state.zoom = data.zoom || 1;
        state.overlays = data.overlays || [];
        state.markers = (data.markers || []).filter(m => m !== null); // Limpeza proativa de nulos
        state.pxPerSecond = data.pxPerSecond || 100;
        state.selectedClips = data.selectedClips || [];
        state.projectSettings = data.projectSettings || { width: 1920, height: 1080, fps: 30, sampleRate: 44100 };
        notifyChange();
    }
}

// ==== CLIP OPERATIONS ====

/**
 * Adiciona um clipe ao estado e sincroniza.
 */
export function addClipToState(src, start, type = 'video', duration = 10, trackId = null, options = {}) {
    // Validação de segurança rigorosa: ignora textos de interface acidentais
    const isUiText = src.includes('Studio Live-PRO') || src.includes('Exportar') || src.includes('◀') || src.length < 5;
    const isUrlPattern = src.match(/^(blob:|data:|http|https|assets\/|C:|D:|\/)/i);

    if (!src || isUiText || !isUrlPattern) {
        return;
    }
    // Se não passar trackId, tenta achar a primeira trilha do tipo correspondente
    if (!trackId) {
        const defaultTrack = state.tracks.find(t => t.type === (type.includes('audio') ? 'audio' : 'video'));
        trackId = defaultTrack ? defaultTrack.id : (type.includes('audio') ? 'audio-1' : 'video-1');
    }

    const newClip = {
        id: crypto.randomUUID(), // ID único seguro
        name: options.name || ('Clip ' + (state.clips.length + 1)),
        src: src, // Local blob ou file URL para o navegador
        serverSrc: options.serverSrc || null, // Caminho para o FFmpeg no servidor
        start: start,
        type: type, // Salva o tipo (video/audio)
        duration: duration,
        offset: 0, // Início do vídeo original
        trackId: trackId, // Associa à trilha
        effects: [],
        exportName: '', // Nome personalizado para exportação individual
        channel: options.channel || 'stereo', // 'left', 'right' ou 'stereo'
        ...options // Spreads other potential options
    };

    state.clips.push(newClip);
    notifyChange();
}

/** * Divide um clip em dois no tempo especificado */
export function splitClip(clipId, splitTime) {
    const clipIndex = state.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return null;

    const originalClip = state.clips[clipIndex];

    // Verifica se o tempo de corte está dentro do clip
    if (splitTime <= originalClip.start || splitTime >= originalClip.start + originalClip.duration) {
        return null;
    }

    // Calcula o ponto de corte relativo ao início do clip
    const relativeSplit = splitTime - originalClip.start;

    // 1. Atualiza o clip original (Esquerda)
    const originalDuration = originalClip.duration;
    originalClip.duration = relativeSplit;

    // 2. Cria o novo clip (Direita)
    const newClip = {
        ...JSON.parse(JSON.stringify(originalClip)), // Clone profundo
        id: crypto.randomUUID(),
        name: originalClip.name + ' (Copy)',
        start: splitTime,
        duration: originalDuration - relativeSplit,
        offset: originalClip.offset + relativeSplit
    };

    // Insere o novo clip logo após o original
    state.clips.splice(clipIndex + 1, 0, newClip);

    notifyChange();

    // Atualiza agulha visualmente
    const playhead = document.getElementById('playhead');
    if (playhead) updatePlayheadPosition(playhead, splitTime, state.pxPerSecond);

    return newClip;
}

/** * Remove um clip do estado */
export function deleteClip(clipId) {
    const index = state.clips.findIndex(c => c.id === clipId);
    if (index !== -1) {
        state.clips.splice(index, 1);
        if (state.selectedClipId === clipId) state.selectedClipId = null;
        state.selectedClips = state.selectedClips.filter(id => id !== clipId);
        notifyChange();
    }
}

// ==== Marcadores (Com Suporte a Anotações) ====
export function addMarker(time, note = '') {
    if (isNaN(time) || time < 0) return; // Validação de segurança

    const timeVal = typeof time === 'number' ? time : parseFloat(time);
    const existing = state.markers.find(m => {
        const mTime = typeof m === 'number' ? m : (m.time || 0);
        return Math.abs(mTime - timeVal) < 0.1;
    });
    if (existing) return;

    state.markers.push({ time: timeVal, note });
    state.markers.sort((a, b) => (a.time || a) - (b.time || b));
    notifyChange();
}

export function updateMarker(time, note) {
    const marker = state.markers.find(m => Math.abs(m.time - time) < 0.1);
    if (marker) {
        marker.note = note;
        notifyChange();
    }
}

export function deleteMarker(time) {
    state.markers = state.markers.filter(m => Math.abs(m.time - time) > 0.1);
    notifyChange();
}

export function moveMarker(oldTime, newTime) {
    const marker = state.markers.find(m => Math.abs(m.time - oldTime) < 0.1);
    if (marker) {
        marker.time = Math.max(0, newTime);
        state.markers.sort((a, b) => a.time - b.time);
        saveState();
        notifyChange();
    }
}

export function batchSplitAtMarkers() {
    if (!state.markers || state.markers.length === 0) return;
    takeSnapshot();

    // Ordena marcadores por tempo para garantir consistência
    const sortedMarkers = [...state.markers].sort((a, b) => {
        const tA = typeof a === 'number' ? a : a.time;
        const tB = typeof b === 'number' ? b : b.time;
        return tA - tB;
    });

    sortedMarkers.forEach(marker => {
        const markerTime = typeof marker === 'number' ? marker : marker.time;

        // Importante: Ao cortar, geramos novos IDs. 
        // Precisamos sempre buscar clipes ATUAIS que cruzam o tempo do marcador.
        const clipsToSplit = state.clips.filter(c =>
            markerTime > c.start && markerTime < (c.start + c.duration)
        );

        clipsToSplit.forEach(clip => {
            splitClip(clip.id, markerTime);
        });
    });

    notifyChange();
}

// ==== TRACK OPERATIONS ====

/** * Adiciona uma nova trilha ao estado */
export function addTrackToState(type = 'video') {
    const count = state.tracks.filter(t => t.type === type).length + 1;
    const newTrack = {
        id: `${type}-${Date.now()}`,
        type: type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}`
    };
    state.tracks.push(newTrack);
    notifyChange();
    return newTrack;
}


/** * Remove gaps between clips in a track */
export function rippleDelete(trackId) {
    const trackClips = state.clips
        .filter(c => c.trackId === trackId)
        .sort((a, b) => a.start - b.start);

    if (trackClips.length <= 1) return;

    takeSnapshot();
    let currentEnd = trackClips[0].start + trackClips[0].duration;

    for (let i = 1; i < trackClips.length; i++) {
        const clip = trackClips[i];
        if (clip.start > currentEnd) {
            clip.start = currentEnd;
        }
        currentEnd = clip.start + clip.duration;
    }

    notifyChange();
    saveState();
}

// ==== UTILS ====

/** * Calcula a duração total do projeto baseada no clip mais longo */
export function getProjectDuration() {
    // Cache para evitar recálculo desnecessário se nada mudou
    if (window._durationCache && window._durationCache.clipsLength === state.clips.length) {
        return window._durationCache.value;
    }

    if (state.clips.length === 0) return 30; // Mínimo de 30s se vazio

    const maxEnd = Math.max(...state.clips.map(c => c.start + c.duration));
    const videoDuration = state.videoElement ? state.videoElement.duration : 0;
    const result = Math.max(30, maxEnd, videoDuration) + 2;

    window._durationCache = {
        clipsLength: state.clips.length,
        value: result
    };

    return result;
}

/** * Formata tempo em segundos para MM:SS */
export function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/** * Atualiza visualmente a agulha baseado no tempo fornecido */
export function updatePlayheadPosition(playheadEl, time, pxPerSec, autoScroll = false, layout = null) {
    if (!playheadEl) return;
    const offset = 80;
    const position = (time * pxPerSec) + offset;

    // Performance: Usar variável CSS + transform para evitar reflow
    // E só atualiza se a posição realmente mudar significativamente
    if (Math.abs((playheadEl._lastPos || 0) - position) < 0.2) return;
    playheadEl._lastPos = position;

    playheadEl.style.setProperty('--playhead-x', `${position}px`);

    // Auto-scroll para manter a agulha vis\u00edvel durante o playback
    if (autoScroll) {
        if (!playheadEl._timelineCache) {
            playheadEl._timelineCache = playheadEl.closest('.timeline');
        }
        const timeline = playheadEl._timelineCache;

        if (timeline) {
            // Se o layout for passado (já lido no início do frame), usa ele para evitar Forced Reflow
            const containerWidth = (layout && layout.viewWidth) || timeline._cachedWidth || 800;
            const scrollLeft = (layout && layout.scrollLeft !== undefined) ? layout.scrollLeft : timeline.scrollLeft;

            if (!layout) {
                // Cache das dimens\u00f5es apenas se n\u00e3o tivermos layout pre-lido
                if (!timeline._lastWidthCheck || Date.now() - timeline._lastWidthCheck > 200) {
                    timeline._cachedWidth = timeline.clientWidth;
                    timeline._lastWidthCheck = Date.now();
                }
            }

            if (position > scrollLeft + (containerWidth * 0.85) || position < scrollLeft) {
                timeline.scrollLeft = position - (containerWidth / 2);
            }
        }
    }
}

export function updateVideoTimeFromClick(e, timeline, video, pxPerSec) {
    const rect = timeline.getBoundingClientRect();
    const scrollLeft = timeline.scrollLeft || 0;
    const offset = 80; // Largura das labels (stickies)

    // Calcula o X relativo ao início da régua/trilhas (descontando labels e considerando scroll)
    const offsetX = (e.clientX - rect.left) + scrollLeft - offset;
    const time = Math.max(0, offsetX / pxPerSec);

    if (video) {
        video.currentTime = time;
    }

    // Atualiza agulha imediatamente
    const playhead = document.getElementById('playhead');
    if (playhead) updatePlayheadPosition(playhead, time, pxPerSec);

    return time; // CRÍTICO: Retorna o tempo para permitir Snapping no clique
}
