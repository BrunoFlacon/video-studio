import { state, getProjectDuration, takeSnapshot, deleteClip, saveState } from './state.js';
import { drawBufferWaveform, getAudioBuffer } from './audio.js';


/**
 * Renderiza a timeline visualmente baseada no estado atual.
 * @param {HTMLElement} containerEl - Elemento DOM que cont\u00e9m as tracks
 * @param {number} pxPerSec - Zoom da timeline (pixels por segundo)
 */
export function renderTimeline(containerEl, pxPerSec) {
    if (!containerEl) return null;

    // --- LEITURAS DE LAYOUT (Lido uma vez no topo para evitar reflow) ---
    const scrollLeft = containerEl.scrollLeft;
    const viewWidth = containerEl.clientWidth || window.innerWidth;
    const projectDuration = Math.max(300, getProjectDuration());
    const totalWidth = projectDuration * pxPerSec;
    const layout = { scrollLeft, viewWidth, totalWidth };

    const TIMELINE_BUFFER_PX = 500;

    // Otimização: Se estivermos tocando, evitamos re-renderizar DOM pesado
    // EXCETO se houver um sinal de mudança estrutural crítica (novo clip, etc)
    if (window.isPlayingGlobal && !window.forceRender) {
        return layout;
    }
    window.forceRender = false;

    // --- ESCRITAS DOM (Batch) ---
    toggleEmptyState();

    let tracksContainer = containerEl.querySelector('.tracks');
    if (!tracksContainer) {
        tracksContainer = document.createElement('div');
        tracksContainer.className = 'tracks';
        containerEl.appendChild(tracksContainer);
        // Setup Lasso only once
        if (!containerEl.dataset.lassoInitialized) {
            setupLassoSelection(containerEl);
            containerEl.dataset.lassoInitialized = 'true';
        }
    }

    // Batch Style Updates
    if (tracksContainer.style.width !== `${totalWidth}px`) {
        tracksContainer.style.setProperty('width', `${totalWidth}px`);
    }
    tracksContainer.style.setProperty('min-width', '100%');

    // Track Reconciliation (Ordenado: Vídeo primeiro)
    const sortedTracksForDom = [...state.tracks].sort((a, b) => {
        if (a.type === 'video' && b.type !== 'video') return -1;
        if (a.type !== 'video' && b.type === 'video') return 1;
        return 0;
    });

    sortedTracksForDom.forEach(track => {
        let trackEl = tracksContainer.querySelector(`.track[id="${track.id}"]`);
        if (!trackEl) {
            trackEl = document.createElement('div');
            trackEl.className = `track ${track.type}-track`;
            trackEl.id = track.id;
            trackEl.dataset.type = track.type;

            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = track.name;
            trackEl.appendChild(label);
        }
        // Sempre re-apensa para garantir a ordem correta no DOM (appendChild move se já existir)
        tracksContainer.appendChild(trackEl);
    });

    Array.from(tracksContainer.querySelectorAll('.track')).forEach(el => {
        if (!state.tracks.find(t => t.id === el.id)) el.remove();
    });

    let rulerContainer = document.getElementById('timelineRuler');
    if (!rulerContainer) {
        rulerContainer = document.createElement('div');
        rulerContainer.className = 'timeline-ruler';
        rulerContainer.id = 'timelineRuler';
        containerEl.prepend(rulerContainer);
    }

    // --- CANVAS RULER IMPLEMENTATION (GPU ACCELERATED) ---
    let rulerCanvas = rulerContainer.querySelector('canvas');
    if (!rulerCanvas) {
        rulerCanvas = document.createElement('canvas');
        rulerCanvas.height = 25;
        rulerContainer.appendChild(rulerCanvas);
    }

    // Resize canvas if needed (Layout + Buffer)
    // Usamos um tamanho fixo grande ou dinâmico? Dinâmico é melhor para memória.
    // Mas para scroll suave, precisamos de um buffer ou redesenhar no scroll.
    // A estratégia mais leve é: Canvas tem o tamanho do VIEWPORT (ou um pouco mais) e movemos o offsetX.

    // Atualiza tamanho do canvas para cobrir a área visível + buffer
    const canvasWidth = layout.viewWidth + TIMELINE_BUFFER_PX * 2;
    if (rulerCanvas.width !== canvasWidth) {
        rulerCanvas.width = canvasWidth;
    }

    // Posiciona o canvas para acompanhar o scroll (Virtual scrolling)
    // O container .timeline-ruler já tem position absolute. 
    // Mas precisamos que o canvas fique fixo na tela ou se mova?
    // Melhor approach: O canvas é filho do timeline, ele tem width total? NÃO. Canvas gigante trava.
    // O canvas deve ter width do viewport e ficar "fixed" visualmente, mas desenhamos o offset dentro dele.

    // ATUALIZAÇÃO: Para simplificar e evitar complexidade de posicionamento relativo:
    // O canvas terá largura do viewport e ficará 'sticky' via JS.
    rulerCanvas.style.position = 'absolute';
    rulerCanvas.style.left = `${layout.scrollLeft}px`;
    rulerCanvas.style.top = '0';

    const ctx = rulerCanvas.getContext('2d', { alpha: false }); // Alpha false otimiza

    // Redesenha Ruler tick marks
    drawRulerCanvas(ctx, layout.scrollLeft, layout.viewWidth, pxPerSec, projectDuration);

    // Garante tamanho do container para scroll funcionar
    if (rulerContainer.style.width !== `${totalWidth}px`) {
        rulerContainer.style.setProperty('width', `${totalWidth}px`);
    }

    // Remove legacy markers if any exist
    // existingMarkers logic removed.


    // 2.1 Renderizar Marcadores de Anotações (Batch Optimized)
    try {
        const markersInState = state.markers || [];
        const existingVisualMarkers = Array.from(tracksContainer.querySelectorAll('.timeline-marker-visual'));
        const visualMarkerMap = new Map();
        existingVisualMarkers.forEach(el => visualMarkerMap.set(el.dataset.time, el));

        // Marcadores do estado
        markersInState.forEach(mObj => {
            if (!mObj) return;
            const mTime = typeof mObj === 'number' ? mObj : mObj.time;
            if (typeof mTime !== 'number' || isNaN(mTime)) return;
            const mNote = typeof mObj === 'number' ? '' : (mObj.note || '');
            const mTimeStr = mTime.toFixed(3);

            let marker = tracksContainer.querySelector(`.timeline-marker-visual[data-time="${mTime}"]`);
            if (!marker) {
                marker = document.createElement('div');
                marker.className = 'timeline-marker-visual';
                marker.dataset.time = mTime;
                marker.textContent = '📍';
                marker.title = mNote || `Marcador em ${mTime.toFixed(2)}s`;

                // Linha Vertical (Visual Guide)
                const line = document.createElement('div');
                line.className = 'marker-line';
                marker.appendChild(line);

                setupMarkerEvents(marker, mTime, mNote, containerEl, pxPerSec);
                tracksContainer.appendChild(marker);
            }
            visualMarkerMap.delete(mTimeStr);

            const x = mTime * pxPerSec;
            marker.style.setProperty('transform', `translateX(${x - 7}px)`); // Centraliza o emoji

            const titleText = mNote ?
                `📌 ${mNote} (${mTime.toFixed(2)}s)` :
                `📌 Marcador: ${mTime.toFixed(2)}s`;
            if (marker.title !== titleText) marker.title = titleText;
        });

        // Remove órfãos
        visualMarkerMap.forEach(el => el.remove());
    } catch (markerErr) { }


    function setupMarkerEvents(marker, mTime, mNote, containerEl, pxPerSec) {
        let clickCount = 0;
        let clickTimer = null;
        let dragStartX = null;
        let dragStartTime = null;
        let hasDragged = false;

        // Click handler (detecta single e double click)
        marker.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Se arrastou, ignora o click
            if (hasDragged) {
                hasDragged = false;
                return;
            }

            clickCount++;

            if (clickCount === 1) {
                // Primeiro click - aguarda para ver se vem um segundo
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                    // Single click - não faz nada, apenas seleciona
                }, 300);
            } else if (clickCount === 2) {
                // Double click - deleta o marcador
                clearTimeout(clickTimer);
                clickCount = 0;

                const { deleteMarker } = await
                    import('./state.js');
                deleteMarker(mTime);
                document.dispatchEvent(new Event('render'));
            }
        });

        // Mousedown - inicia possível drag
        marker.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;

            dragStartX = e.clientX;
            dragStartTime = Date.now();
            hasDragged = false;

            const originalLeft = parseFloat(marker.style.getPropertyValue('left')) || (mTime * pxPerSec);
            let latestTime = mTime;

            const onMove = (moveEvt) => {
                const dx = moveEvt.clientX - dragStartX;

                // Só considera drag se moveu mais de 5 pixels
                if (Math.abs(dx) > 5) {
                    hasDragged = true;
                    marker.classList.add('dragging');

                    const newLeft = originalLeft + dx;
                    marker.style.setProperty('left', `${newLeft}px`);
                    latestTime = Math.max(0, (newLeft) / pxPerSec);
                }
            };

            const onUp = async () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                marker.classList.remove('dragging');

                // Só aplica a mudança se realmente arrastou
                if (hasDragged && Math.abs(latestTime - mTime) > 0.05) {
                    const { moveMarker } = await
                        import('./state.js');
                    moveMarker(mTime, latestTime);
                    document.dispatchEvent(new Event('render'));
                }

                // Reset após um pequeno delay para não interferir com click
                setTimeout(() => {
                    hasDragged = false;
                }, 50);
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // Context menu - editar nota
        marker.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const newNote = prompt('Editar anotação:', mNote || '');
            if (newNote !== null) {
                const { updateMarker } = await
                    import('./state.js');
                updateMarker(mTime, newNote);
                document.dispatchEvent(new Event('render'));
            }
        });
    }

    // 3. Renderiza Clips para cada Trilha Existente (Ordenado: Vídeo primeiro)
    const sortedTracks = [...state.tracks].sort((a, b) => {
        if (a.type === 'video' && b.type !== 'video') return -1;
        if (a.type !== 'video' && b.type === 'video') return 1;
        return 0;
    });

    const vStartTime = (containerEl.scrollLeft - 80) / pxPerSec;
    const vEndTime = vStartTime + (containerEl.clientWidth / pxPerSec) + 10;

    sortedTracks.forEach(track => {
        const trackEl = tracksContainer.querySelector(`.track[id="${track.id}"]`);
        if (trackEl) {
            const clipsInTrack = (state.clips || []).filter(c => c.trackId === track.id);
            // VIRTUALIZAÇÃO: Filtra apenas clips que estão (pelo menos parcialmente) visíveis no viewport
            const visibleClips = clipsInTrack.filter(c => {
                const cEnd = c.start + c.duration;
                return (c.start <= vEndTime && cEnd >= vStartTime);
            });
            renderClipsInTrack(trackEl, visibleClips, pxPerSec, track.type, clipsInTrack.length);
        }
    });

    return layout;
}

function renderClipsInTrack(trackEl, clips, pxPerSec, trackType, totalClipsCount) {
    // 1. Mapeia clips atuais para remoção e limpeza de redundância
    const existingClips = new Map();
    // PERFORMANCE: Se houver muitos clips, querySelectorAll é lento. 
    // Usamos children se possível.
    Array.from(trackEl.children).forEach(el => {
        if (el.classList.contains('clip')) {
            const id = el.dataset.id;
            if (id) existingClips.set(id, el);
        }
    });

    const clipsInState = new Set(clips.map(c => c.id));

    // 2. Sincroniza clips do estado com o DOM
    clips.forEach(clip => {
        let el = existingClips.get(clip.id);
        const isSelected = state.selectedClipId === clip.id || state.selectedClips?.includes(clip.id);

        if (!el) {
            // CRIAR NOVO CLIP
            el = document.createElement('div');
            el.className = 'clip';
            el.dataset.id = clip.id;

            // Classes baseadas no estado
            const isAudio = trackType === 'audio' || (clip.type && clip.type.includes('audio'));
            el.classList.add(isAudio ? 'audio-clip' : 'video-clip');

            // Conteúdo do Clip (Título + Waveform placeholder)
            const label = document.createElement('span');
            label.className = 'clip-label';
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = `input-${clip.id}`;
            nameInput.name = `clip_name_${clip.id}`;
            nameInput.className = 'clip-name-input';
            nameInput.addEventListener('mousedown', e => e.stopPropagation());
            nameInput.addEventListener('change', (e) => {
                clip.exportName = e.target.value;
                saveState();
            });
            label.appendChild(nameInput);
            el.appendChild(label);

            // Botão de Excluir (X)
            const btnDel = document.createElement('button');
            btnDel.className = 'clip-delete-btn';
            btnDel.textContent = '×';
            btnDel.title = 'Excluir Clip';
            btnDel.addEventListener('mousedown', e => e.stopPropagation());
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                takeSnapshot();
                deleteClip(clip.id);
                document.dispatchEvent(new Event('render'));
            });
            el.appendChild(btnDel);

            // Alças de Redimensionamento (Handles)
            const handleL = document.createElement('div');
            handleL.className = 'handle handle-l';
            const handleR = document.createElement('div');
            handleR.className = 'handle handle-r';
            el.appendChild(handleL);
            el.appendChild(handleR);

            // Configura eventos (Uma única vez)
            setupClipEvents(el, clip, handleL, handleR, trackEl, pxPerSec);

            trackEl.appendChild(el);
        }

        // ATUALIZAR CLIP EXISTENTE (Ou recém-criado)
        el.classList.toggle('selected', isSelected);

        const left = clip.start * pxPerSec;
        const width = clip.duration * pxPerSec;

        // PERFORMANCE: Só atualiza style se mudou significativamente (evita reflow do browser)
        if (Math.abs((el._lastLeft || 0) - left) > 0.1) {
            el.style.setProperty('left', `${left}px`);
            el._lastLeft = left;
        }
        if (Math.abs((el._lastWidth || 0) - width) > 0.1) {
            el.style.setProperty('width', `${width}px`);
            el._lastWidth = width;
        }

        // Título e Waveform (Lazy load)
        const nameInput = el.querySelector('input');
        if (nameInput && nameInput.value !== (clip.exportName || clip.name)) {
            nameInput.value = clip.exportName || clip.name;
        }

        // Renderização de Conteú do (Só se mudou algo ou não tem conteúdo)
        if (!el.dataset.rendered || el.dataset.zoom !== pxPerSec.toString()) {
            el.dataset.rendered = 'true';
            el.dataset.zoom = pxPerSec.toString();

            if (trackType === 'audio') {
                let canvas = el.querySelector('canvas.clip-waveform');
                if (!canvas) {
                    canvas = document.createElement('canvas');
                    canvas.className = 'clip-waveform';
                    el.appendChild(canvas);
                }
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(() => drawClipWaveform(clip, canvas, pxPerSec));
                } else {
                    setTimeout(() => drawClipWaveform(clip, canvas, pxPerSec), 10);
                }
            } else {
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(() => drawVideoFrames(clip, el, pxPerSec));
                } else {
                    setTimeout(() => drawVideoFrames(clip, el, pxPerSec), 20);
                }
            }
        }
    });

    // 3. Remove clips que não existem mais no estado
    existingClips.forEach((el, id) => {
        if (!clipsInState.has(id)) el.remove();
    });
}

function setupClipEvents(el, clip, handleL, handleR, trackEl, pxPerSec) {
    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();

        // Retoma AudioContext na interação do usuário (CSP/Browser requirement)
        if (window.audioCtx && window.audioCtx.state === 'suspended') {
            window.audioCtx.resume();
        }

        takeSnapshot();
        // Seleção Múltipla (Shift ou Ctrl/Cmd)
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (state.selectedClips.includes(clip.id)) {
                state.selectedClips = state.selectedClips.filter(id => id !== clip.id);
                el.classList.remove('selected');
                if (state.selectedClipId === clip.id) {
                    state.selectedClipId = state.selectedClips[state.selectedClips.length - 1] || null;
                }
            } else {
                state.selectedClips.push(clip.id);
                state.selectedClipId = clip.id;
                el.classList.add('selected');
            }
        } else {
            state.selectedClipId = clip.id;
            state.selectedClips = [clip.id];
            document.querySelectorAll('.clip.selected').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
        }

        const startX = e.clientX;
        const originalStart = clip.start;
        const originalDuration = clip.duration;
        const originalOffset = clip.offset;

        let action = 'move';
        if (e.target === handleL) action = 'trim-left';
        if (e.target === handleR) action = 'trim-right';

        let rAF = null;

        const onMouseMove = (moveEvent) => {
            if (rAF) return;

            rAF = requestAnimationFrame(() => {
                const deltaPx = moveEvent.clientX - startX;
                const deltaSec = deltaPx / pxPerSec;

                let newStart = originalStart + deltaSec;
                if (newStart < 0) newStart = 0;

                // --- DETECÇÃO DE COLISÃO E SNAP (IMÃ) ---
                const getCollision = (start, duration) => {
                    const end = start + duration;
                    return state.clips.find(c =>
                        c.id !== clip.id &&
                        c.trackId === clip.trackId &&
                        !c.offline &&
                        ((start >= c.start && start < (c.start + c.duration)) ||
                            (end > c.start && end <= (c.start + c.duration)) ||
                            (start <= c.start && end >= (c.start + c.duration)))
                    );
                };

                // --- SNAP ---
                if (state.snapEnabled !== false) {
                    const snapThresholdSec = 10 / pxPerSec;
                    let bestSnap = null;
                    let minDelta = snapThresholdSec;

                    const candidates = [];
                    if (state.markers) state.markers.forEach(m => candidates.push(typeof m === 'number' ? m : m.time));
                    if (window.globalTime !== undefined) candidates.push(window.globalTime);
                    state.clips.forEach(c => {
                        if (c.id !== clip.id) {
                            candidates.push(c.start);
                            candidates.push(c.start + c.duration);
                        }
                    });

                    candidates.forEach(point => {
                        const dStart = Math.abs(newStart - point);
                        if (dStart < minDelta) { minDelta = dStart; bestSnap = point; }
                        const dEnd = Math.abs((newStart + clip.duration) - point);
                        if (dEnd < minDelta) { minDelta = dEnd; bestSnap = point - clip.duration; }
                    });

                    if (bestSnap !== null) newStart = bestSnap;
                }

                if (action === 'move') {
                    // Colisão no Movimento
                    if (getCollision(newStart, clip.duration)) {
                        // Se houver colisão, tentamos parar no limite (Magnetismo de borda)
                        const coll = getCollision(newStart, clip.duration);
                        if (newStart < coll.start) newStart = coll.start - clip.duration;
                        else newStart = coll.start + coll.duration;
                    }

                    clip.start = newStart;
                    el.style.transform = `translateX(${(newStart * pxPerSec)}px)`;
                } else if (action === 'trim-right') {
                    let newDuration = originalDuration + deltaSec;
                    if (newDuration < 0.1) newDuration = 0.1;

                    // Colisão no Trim Right
                    const end = clip.start + newDuration;
                    const coll = state.clips.find(c =>
                        c.id !== clip.id && c.trackId === clip.trackId && !c.offline &&
                        end > c.start && clip.start < c.start
                    );
                    if (coll) newDuration = coll.start - clip.start;

                    clip.duration = newDuration;
                    el.style.width = `${newDuration * pxPerSec}px`;
                } else if (action === 'trim-left') {
                    let newDuration = originalDuration - deltaSec;
                    if (newDuration < 0.1) { rAF = null; return; }

                    // Colisão no Trim Left
                    const coll = state.clips.find(c =>
                        c.id !== clip.id && c.trackId === clip.trackId && !c.offline &&
                        newStart < (c.start + c.duration) && (originalStart + originalDuration) > (c.start + c.duration)
                    );
                    if (coll) {
                        newStart = coll.start + coll.duration;
                        newDuration = (originalStart + originalDuration) - newStart;
                    }

                    if (newStart < 0) newStart = 0;
                    clip.start = newStart;
                    clip.duration = newDuration;
                    clip.offset = originalOffset + (newStart - originalStart);

                    el.style.transform = `translateX(${(newStart * pxPerSec)}px)`;
                    el.style.width = `${newDuration * pxPerSec}px`;
                }

                rAF = null;
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (rAF) cancelAnimationFrame(rAF);

            // Re-renderização final para ajustar waveforms e marcadores de tempo
            const container = document.getElementById('timeline') || trackEl.parentElement;
            renderTimeline(container, pxPerSec);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // MENU DE CONTEXTO (Right Click)
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.selectedClipId = clip.id;
        // Atualiza visualmente a seleção
        document.querySelectorAll('.clip.selected').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');

        // Abre o painel de transformação
        import('./transform.js?v=3').then(mod => {
            mod.showTransformPanel(clip.id);
        });
    });
}


/*** Desenha uma representação visual (onda) no clip. */
async function drawClipWaveform(clip, canvas, pxPerSec) {
    if (clip.offline) return; // Não tenta buscar áudio se estiver offline
    const isAudio = clip.type && clip.type.includes('audio');
    const color = isAudio ? '#10b981' : '#6366f1';

    // Usa a largura calculada baseada na duração e zoom, em vez de offsetWidth
    const width = clip.duration * pxPerSec;
    const height = 80; // Altura fixa aumentada para visualização clara (Track tem 100px)

    canvas.width = Math.min(width, 16384); // Limite extremo seguro
    canvas.height = height;

    // Busca o buffer (pula se estiver offline ou for link morto)
    try {
        if (clip.offline || (clip.src && window.deadMediaSet?.has(clip.src))) {
            throw new Error("Mídia Offline");
        }

        const buffer = await getAudioBuffer(clip.src);

        if (buffer) {
            // Define cor baseada no canal
            let waveformColor = '#10b981'; // Default
            if (clip.channel === 'right') waveformColor = '#6366f1';

            // Lógica de Canal: Se tiver 'channel' definido (left/right), força MONO do canal específico
            // Se não tiver, e o buffer for stereo, aí sim desenha stereo
            const isSpecificChannel = clip.channel === 'left' || clip.channel === 'right';
            const channelIndex = clip.channel === 'right' ? 1 : 0;

            if (!isSpecificChannel && buffer.numberOfChannels >= 2) {
                // Stereo Completo (comportamento padrão antigo)
                drawBufferWaveform(canvas, buffer, waveformColor, clip.offset || 0, clip.duration, 0, true);
            } else {
                // Mono do canal selecionado (Esq ou Dir)
                drawBufferWaveform(canvas, buffer, waveformColor, clip.offset || 0, clip.duration, channelIndex, false);
            }
        } else {
            throw new Error("Buffer nulo");
        }
    } catch (err) {
        // Fallback visual (Linhas verticais aleatórias) se falhar
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const step = 4;
        const amp = canvas.height / 2;
        for (let i = 0; i < canvas.width; i += step) {
            const h = Math.random() * canvas.height * 0.3;
            ctx.moveTo(i, amp - h);
            ctx.lineTo(i, amp + h);
        }
        ctx.stroke();
    }
}


const frameCache = new Map(); // Cache para thumbnails [clipId-time]: blobUrl
const frameAbortControllers = new Map(); // [clipId]: AbortController

/**
 * Desenha frames de vídeo como miniaturas no clip (Otimizado com Cancelamento).
 */
async function drawVideoFrames(clip, container, pxPerSec) {
    if (!clip.type || !clip.type.includes('video') || clip.offline || (window.deadMediaSet && window.deadMediaSet.has(clip.src))) return;

    const clipWidth = clip.duration * pxPerSec;
    if (clipWidth < 40) return; // Muito pequeno para frames

    // Cancelar renderização anterior deste clip se houver
    if (frameAbortControllers.has(clip.id)) {
        frameAbortControllers.get(clip.id).abort();
    }
    const abortController = new AbortController();
    frameAbortControllers.set(clip.id, abortController);
    const signal = abortController.signal;

    // Adiciona container de frames se não existir
    let framesEl = container.querySelector('.clip-frames');
    if (!framesEl) {
        framesEl = document.createElement('div');
        framesEl.className = 'clip-frames';
        container.appendChild(framesEl);
    }

    // Otimização: Só limpa se o zoom mudou drasticamente ou o clip mudou
    if (container.dataset.zoom !== pxPerSec.toString()) {
        while (framesEl.firstChild) framesEl.removeChild(framesEl.firstChild);
    } else if (framesEl.firstChild) {
        return; // Já renderizado para este zoom
    }

    // Calcula intervalo entre frames (aumentado: 200px)
    const frameIntervalPx = 200;
    const maxFrames = 15; // Limite máximo de frames por clip
    let numFrames = Math.floor(clipWidth / frameIntervalPx);
    if (numFrames > maxFrames) numFrames = maxFrames;
    const timeStep = clip.duration / Math.max(1, numFrames);

    const renderFramesChunked = async () => {
        const fragment = document.createDocumentFragment();
        const batchSize = 2; // Processa menos por vez

        for (let i = 0; i < numFrames; i++) {
            if (signal.aborted) return;

            const timeOffset = clip.offset + (i * timeStep);
            const cacheKey = `${clip.src}-${timeOffset.toFixed(1)}`;
            let frameUrl = frameCache.get(cacheKey);

            const img = document.createElement('img');
            img.className = 'clip-frame-img';
            img.style.setProperty('height', '100%');

            if (frameUrl) {
                img.src = frameUrl;
            } else {
                img.style.setProperty('background-color', '#000');
                // Captura em background (sequencial)
                captureVideoFrame(clip.src, timeOffset).then(url => {
                    if (url && !signal.aborted) {
                        frameCache.set(cacheKey, url);
                        if (container.contains(img)) img.src = url;
                    }
                });
            }
            fragment.appendChild(img);

            if (i > 0 && i % batchSize === 0) {
                await new Promise(r => requestAnimationFrame(r));
            }
        }

        if (!signal.aborted) {
            requestAnimationFrame(() => {
                if (container.contains(framesEl)) {
                    framesEl.appendChild(fragment);
                }
            });
        }
    };

    renderFramesChunked();
}


/**
 * Captura um \u00fanico frame do v\u00eddeo num tempo espec\u00edfico
 */
// Singleton de v\u00eddeo para evitar cria\u00e7\u00e3o excessiva de elementos
let hiddenVideo = null;
let captureQueue = Promise.resolve();

/**
 * Captura um \u00fanico frame do v\u00eddeo num tempo espec\u00edfico de forma serializada
 */
async function captureVideoFrame(src, time) {
    if (!src || (window.deadMediaSet && window.deadMediaSet.has(src))) return null;

    // Adiciona a tarefa \u00e0 fila sequencial
    captureQueue = captureQueue.then(async () => {
        return new Promise((resolve) => {
            if (!hiddenVideo) {
                hiddenVideo = document.createElement('video');
                hiddenVideo.muted = true;
                hiddenVideo.style.display = 'none';
                document.body.appendChild(hiddenVideo);
            }

            const onSeeked = () => {
                cleanup();
                try {
                    const canvas = document.createElement('canvas');
                    const ratio = hiddenVideo.videoWidth / hiddenVideo.videoHeight || 16 / 9;
                    canvas.height = 60;
                    canvas.width = canvas.height * ratio;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.4));
                } catch (e) { resolve(null); }
            };

            const onError = () => {
                cleanup();
                if (window.deadMediaSet) window.deadMediaSet.add(src);
                // Auto-healing: marca clips com este src como offline no estado
                state.clips.forEach(c => { if (c.src === src) c.offline = true; });
                resolve(null);
            };

            const cleanup = () => {
                hiddenVideo.removeEventListener('seeked', onSeeked);
                hiddenVideo.removeEventListener('error', onError);
            };

            hiddenVideo.addEventListener('seeked', onSeeked);
            hiddenVideo.addEventListener('error', onError);

            try {
                if (hiddenVideo.src !== src) {
                    hiddenVideo.src = src;
                } else {
                    hiddenVideo.currentTime = time;
                }
            } catch (e) { onError(); }

            setTimeout(() => {
                cleanup();
                resolve(null);
            }, 3000);
        });
    });

    return captureQueue;
}




// --- ESSENTIAL UTILS ---

// Helper simple hash para o ID
String.prototype.hashCode = function () {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        hash = (this.charCodeAt(i) + (hash << 5) - hash) | 0;
    }
    return hash;
};

/**
 * Fun\u00e7\u00e3o interna para marcar um clip como selecionado no estado
 */
function selectClip(id) {
    if (state.selectedClipId === id) return;
    state.selectedClipId = id;

    // Dispara re-render da timeline para mostrar o botão 'X' e borda
    const container = document.getElementById('timeline');
    if (container) {
        renderTimeline(container, state.pxPerSecond || 100);
    }

    // Abre painel de transformação para vídeo
    const clip = state.clips.find(c => c.id === id);
    if (clip && clip.type.includes('video')) {
        import('../core/transform.js').then(m => m.showTransformPanel(id));
    }
}

export function deleteSelectedClip() {
    if (!state.selectedClipId) return;
    deleteClip(state.selectedClipId);
}

// ======================================================
// LASSO SELECTION (Seleção por arrastar)
// ======================================================
function setupLassoSelection(container) {
    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let selectionBox = null;

    container.addEventListener('mousedown', (e) => {
        // Ignorar se clicar em clips, handles, scrollbars ou header
        if (e.target.closest('.clip') || e.target.closest('.handle') ||
            e.target.closest('.timeline-header') || e.target.closest('.timeline-ruler')) return;

        // Ignorar clique com botão direito ou meio
        if (e.button !== 0) return;

        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;

        // Limpar seleção anterior se não estiver segurando Ctrl/Shift
        if (!e.ctrlKey && !e.shiftKey) {
            state.selectedClips = [];
            state.selectedClipId = null;
            document.querySelectorAll('.clip.selected').forEach(el => el.classList.remove('selected'));
        }

        // Criar caixa de seleção visual
        selectionBox = document.createElement('div');
        selectionBox.className = 'selection-box';
        selectionBox.style.setProperty('position', 'fixed');
        selectionBox.style.setProperty('border', '1px solid rgba(59, 130, 246, 0.8)');
        selectionBox.style.setProperty('backgroundColor', 'rgba(59, 130, 246, 0.2)');
        selectionBox.style.setProperty('z-index', '9999');
        selectionBox.style.setProperty('pointerEvents', 'none');
        selectionBox.style.setProperty('left', `${startX}px`);
        selectionBox.style.setProperty('top', `${startY}px`);
        selectionBox.style.setProperty('width', '0px');
        selectionBox.style.setProperty('height', '0px');
        document.body.appendChild(selectionBox);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isSelecting || !selectionBox) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(currentX, startX);
        const top = Math.min(currentY, startY);

        selectionBox.style.setProperty('width', `${width}px`);
        selectionBox.style.setProperty('height', `${height}px`);
        selectionBox.style.setProperty('left', `${left}px`);
        selectionBox.style.setProperty('top', `${top}px`);

        // Detectar interseção com clips
        const boxRect = selectionBox.getBoundingClientRect();
        const clips = container.querySelectorAll('.clip');

        clips.forEach(clipEl => {
            const clipRect = clipEl.getBoundingClientRect();

            // Verificar colisão simples (AABB)
            const intersects = !(
                boxRect.right < clipRect.left ||
                boxRect.left > clipRect.right ||
                boxRect.bottom < clipRect.top ||
                boxRect.top > clipRect.bottom
            );

            if (intersects) {
                clipEl.classList.add('selected');
                if (!state.selectedClips.includes(clipEl.dataset.id)) {
                    state.selectedClips.push(clipEl.dataset.id);
                }
            }
        });
        state.selectedClipId = state.selectedClips.length > 0 ? state.selectedClips[0] : null;
    });

    window.addEventListener('mouseup', (e) => {
        if (!isSelecting) return;

        isSelecting = false;
        if (selectionBox) {
            selectionBox.remove();
            selectionBox = null;
            // Notificar UI
            const timelineContainer = document.getElementById('timeline');
            if (timelineContainer) renderTimeline(timelineContainer, state.pxPerSecond || 100);
        }
    });
}

/**
 * Fun\u00e7\u00e3o para cortar todos os clips no ponto atual (Corte Global)
 */
export function splitAtPlayhead(containerEl, pxPerSec, customTime = null) {
    // Prioriza o tempo passado (globalTime do editor)
    const currentTime = customTime !== null ? customTime : (state.globalTime || 0);

    // 2. Achar todos os clips nesse tempo
    const clipsToSplit = state.clips.filter(c =>
        currentTime > c.start && currentTime < (c.start + c.duration)
    );

    if (clipsToSplit.length === 0) return false;

    clipsToSplit.forEach(originalClip => {
        const clipIndex = state.clips.indexOf(originalClip);
        const splitOffset = currentTime - originalClip.start;

        // Novo Clip 1: Come\u00e7a igual, dura\u00e7\u00e3o = splitOffset
        const newClip1 = {
            ...originalClip,
            id: crypto.randomUUID(),
            duration: splitOffset
        };

        // Novo Clip 2: Come\u00e7a em currentTime, dura\u00e7\u00e3o = resto. 
        const newClip2 = {
            ...originalClip,
            id: crypto.randomUUID(),
            start: currentTime,
            duration: originalClip.duration - splitOffset,
            offset: (originalClip.offset || 0) + splitOffset
        };

        state.clips.splice(clipIndex, 1, newClip1, newClip2);
    });

    const container = containerEl || document.getElementById('timeline');
    renderTimeline(container, pxPerSec || 100);
    return true;
}
export function toggleEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const previewVideo = document.getElementById('previewVideo');

    if (state.clips.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (previewVideo) previewVideo.classList.add('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        if (previewVideo) previewVideo.classList.remove('hidden');
    }
}
/**
 * Desenha a régua usando Canvas API (Alta Performance)
 */
function drawRulerCanvas(ctx, scrollLeft, viewWidth, pxPerSec, totalDuration) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Clear
    ctx.fillStyle = '#0d0d0f';
    ctx.fillRect(0, 0, width, height);

    // Top border
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, height - 1, width, 1);

    // Calcula range de tempo visível
    // O canvas está deslocado por 'scrollLeft' (via CSS left), então o x=0 no canvas é o scrollLeft no mundo real
    // Espera... se definimos canvas.style.left = scrollLeft, então o canvas 'acompanha' o scroll.
    // Logo, o pixel 0 do canvas corresponde ao pixel 'scrollLeft' da timeline global.
    // O tempo em x=0 do canvas é: scrollLeft / pxPerSec.

    const startPixel = scrollLeft;
    const endPixel = scrollLeft + width; // renderizamos um pouco mais que o viewWidth se o canvas for maior

    const startTime = startPixel / pxPerSec;
    const endTime = endPixel / pxPerSec;

    // Lógica de Steps (Mesma do original)
    let step, subStep, formatFn;

    if (pxPerSec < 0.5) {
        step = 300; subStep = 60;
        formatFn = t => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60); return h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${m}:00`; };
    }
    else if (pxPerSec < 2) { step = 60; subStep = 15; formatFn = t => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`; }
    else if (pxPerSec < 15) { step = 10; subStep = 2; formatFn = t => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`; }
    else if (pxPerSec < 50) { step = 5; subStep = 1; formatFn = t => `${t}s`; }
    else if (pxPerSec < 150) { step = 1; subStep = 0.5; formatFn = t => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`; }
    else if (pxPerSec < 500) { step = 0.5; subStep = 0.1; formatFn = t => `${t.toFixed(1)}s`; }
    else { step = 0.1; subStep = 0.05; formatFn = t => `${Math.floor(t)}:${Math.round((t % 1) * 1000).toString().padStart(3, '0')}`; }

    // Ajusta start para múltiplo do step
    const tStart = Math.floor(startTime / step) * step;

    ctx.fillStyle = '#a1a1aa'; // Cor do texto
    ctx.strokeStyle = '#3f3f46'; // Cor do tick
    ctx.lineWidth = 1;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';

    ctx.beginPath();

    for (let t = tStart; t <= endTime; t += step) {
        // Posição X relativa ao Canvas
        // X global = t * pxPerSec
        // X canvas = X global - scrollLeft
        const xGlobal = t * pxPerSec;
        const xLocal = xGlobal - scrollLeft;

        if (xLocal < -50 || xLocal > width + 50) continue;

        // Tick Principal
        ctx.moveTo(xLocal + 0.5, 0);
        ctx.lineTo(xLocal + 0.5, height);

        // Label
        if (t >= 0) {
            ctx.fillText(formatFn(t), xLocal + 4, 12);
        }

        // Sub-ticks
        if (subStep && pxPerSec > 5) {
            for (let st = t + subStep; st < t + step; st += subStep) {
                const sxGlobal = st * pxPerSec;
                const sxLocal = sxGlobal - scrollLeft;
                if (sxLocal > width) break;

                // Sub tick height (40% do bottom)
                const tickH = height * 0.4;
                ctx.moveTo(sxLocal + 0.5, height - tickH);
                ctx.lineTo(sxLocal + 0.5, height);
            }
        }
    }
    ctx.stroke();
}
