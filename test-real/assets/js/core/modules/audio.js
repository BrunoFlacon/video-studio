// audio.js - Utilitário para processamento e visualização de áudio
let audioCtx = null;
const bufferCache = new Map(); // Cache para resultados finais
const pendingRequests = new Map(); // Controle de promessas em andamento

// Conjunto global para URLs bloqueadas (Auto-healing)
if (!window.deadMediaSet) window.deadMediaSet = new Set();

/**
 * Obtém o buffer de áudio de uma URL com cache e controle de concorrência.
 */
export async function getAudioBuffer(url) {
    if (!url || url.startsWith('blob:offline') || window.deadMediaSet.has(url)) return null;
    if (bufferCache.has(url)) return bufferCache.get(url);
    if (pendingRequests.has(url)) return pendingRequests.get(url);

    // CONTROLE DE CONCORRÊNCIA (Semáforo)
    // Evita travar a thread principal decodificando 50 arquivos ao mesmo tempo.
    while (window.activeDecodes >= 2) {
        await new Promise(r => setTimeout(r, 100));
    }

    if (!window.activeDecodes) window.activeDecodes = 0;
    window.activeDecodes++;

    const promise = (async () => {
        try {
            if (!window.audioUnlocked) { window.activeDecodes--; return null; }

            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                window.audioCtx = audioCtx;
            }

            // Otimização: Não forçar resume se estivermos em loop crítico de renderização (evita stutter)
            if (audioCtx.state === 'suspended' && window.isRendering) {
                return null;
            }

            if (audioCtx.state === 'suspended') {
                // Resume apenas se for interação do usuário explícita (tratado upstream)
                // await audioCtx.resume().catch(() => { }); 
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            // Fetch direto (Blobs não aceitam HEAD ou métodos parciais de forma confiável em todos ambientes)
            const response = await fetch(url, { signal: controller.signal }).catch(() => null);
            clearTimeout(timeout);

            if (!response || !response.ok) {
                window.deadMediaSet.add(url);
                return null;
            }

            const arrayBuffer = await response.arrayBuffer().catch(() => null);
            if (!arrayBuffer) return null;

            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer).catch(() => {
                window.deadMediaSet.add(url);
                return null;
            });

            if (audioBuffer) bufferCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (e) {
            window.deadMediaSet.add(url);
            return null;
        } finally {
            window.activeDecodes--;
            pendingRequests.delete(url);
        }
    })();

    pendingRequests.set(url, promise);
    return promise;
}






/**
 * Desenha a Waveform de um buffer específico num canvas, considerando recortes (offset/duration)
 * Suporta renderização stereo lado a lado quando stereoMode = true
 */
export function drawBufferWaveform(canvas, audioBuffer, color = '#10b981', offset = 0, duration = null, channelIndex = 0, stereoMode = false) {
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const sampleRate = audioBuffer.sampleRate;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1.0;

    // Calcula range de samples baseado no tempo
    const startSample = Math.floor(offset * sampleRate);
    const totalDuration = duration || audioBuffer.duration;
    const endSample = Math.min(audioBuffer.length, startSample + Math.floor(totalDuration * sampleRate));
    const samplesToDraw = endSample - startSample;

    if (samplesToDraw <= 0) return;

    const step = samplesToDraw / width;
    const amp = stereoMode ? (height / 4) : (height / 2); // Amplitude base

    // MODO OTIMIZADO: Baldeamento (Bucketing)
    const drawChannel = (data, yCenter, channelAmp) => {
        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            const start = Math.floor(startSample + i * step);
            const end = Math.floor(startSample + (i + 1) * step);

            let min = 1.0;
            let max = -1.0;

            if (step > 100) {
                const val = data[start] || 0;
                min = val; max = val;
                // OTIMIZAÇÃO: Stride (Pular amostras)
                // Se o bucket for gigante (ex: zoom out em musica longa), não lemos todos os 44k samples
                // Limitamos a ler no máximo 64 amostras representativas por pixel
                const stride = Math.ceil((end - start) / 64);

                for (let j = start; j < end; j += stride) {
                    const v = data[j];
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
            } else {
                for (let j = start; j < end; j++) {
                    const val = data[j];
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }

            const yMin = yCenter + (min * channelAmp);
            const yMax = yCenter + (max * channelAmp);

            if (i === 0) ctx.moveTo(i, yMin);
            ctx.lineTo(i, yMax);
        }
        ctx.stroke();
    };

    if (stereoMode && audioBuffer.numberOfChannels >= 2) {
        const halfHeight = height / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(0, 0, width, halfHeight);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, halfHeight, width, halfHeight);

        ctx.strokeStyle = '#10b981';
        drawChannel(audioBuffer.getChannelData(0), halfHeight / 2, halfHeight * 0.4);

        ctx.strokeStyle = '#34d399';
        drawChannel(audioBuffer.getChannelData(1), halfHeight + (halfHeight / 2), halfHeight * 0.4);
    } else {
        // MONO / SINGLE CHANNEL (Full Height)
        const activeChannel = (channelIndex < audioBuffer.numberOfChannels) ? channelIndex : 0;
        ctx.strokeStyle = color;

        // AMPLITUDE BOOST: Multiplica por 1.8 para "engrossar" ondas baixas
        // A altura é height * 0.9 para quase total
        drawChannel(audioBuffer.getChannelData(activeChannel), height / 2, height * 0.45 * 1.8);
    }
}


/**
 * Analisa os canais de áudio para detectar Stereo/Mono e silêncio.
 */
export async function analyzeAudioChannels(url) {
    const buffer = await getAudioBuffer(url);
    if (!buffer) return { channels: 0, active: [], duration: 0 };

    const channels = buffer.numberOfChannels;
    const active = [];
    const threshold = 0.0005; // Mais sensível para não ignorar áudios baixos

    for (let i = 0; i < channels; i++) {
        const data = buffer.getChannelData(i);
        // Analisa 10 segundos para ter mais precisão no início
        const sampleLimit = Math.min(data.length, buffer.sampleRate * 10);
        let hasSound = false;
        for (let j = 0; j < sampleLimit; j += 50) { // Step menor para mais precisão
            if (Math.abs(data[j]) > threshold) {
                hasSound = true;
                break;
            }
        }
        if (hasSound) active.push(i);
    }

    return {
        channels,
        active,
        duration: buffer.duration
    };
}

/**
 * Obtém metadados rápidos (duração) sem decodificar o áudio completo.
 */
export async function getFastMetadata(url, type) {
    return new Promise((resolve) => {
        const isImage = type.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        if (isImage) {
            resolve({ duration: 5 });
            return;
        }

        const temp = document.createElement(type.includes('audio') ? 'audio' : 'video');
        temp.preload = 'metadata';
        temp.src = url;

        const cleanup = () => {
            temp.onloadedmetadata = null;
            temp.onerror = null;
            temp.src = "";
            try { temp.load(); } catch (e) { }
        };

        temp.onloadedmetadata = () => {
            const duration = temp.duration || 10;
            cleanup();
            resolve({ duration });
        };

        temp.onerror = () => {
            cleanup();
            resolve({ duration: 10 }); // Fallback
        };

        // Timeout de segurança
        setTimeout(() => {
            cleanup();
            resolve({ duration: 10 });
        }, 5000);
    });
}

/**
 * AUDIO POOL - Gerenciamento de instâncias de áudio para sincronia.
 */
const audioPool = new Map(); // [clipId]: { el, src }

/**
 * Inicializa o pool de áudio (Pode ser chamado na inicialização do editor)
 */
export function initAudioPool() {
    if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

/**
 * Sincroniza áudios secundários (trilhas de áudio) com o tempo global e estado de reprodução.
 */
export function syncSecondaryAudios(globalTime, isPlaying) {
    if (!window.state || !window.state.clips) return;

    // Filtra apenas clips de áudio (ou vídeo que deve tocar apenas áudio em trilhas secundárias)
    const audioClips = window.state.clips.filter(c =>
        (c.type?.includes('audio') || c.trackId?.startsWith('audio')) && !c.offline
    );

    // Itera sobre todos os clips de áudio do estado
    audioClips.forEach(clip => {
        // Otimização: Uso de < no final para evitar que clipes adjacentes toquem juntos no mesmo milissegundo
        const isVisible = globalTime >= clip.start && globalTime < (clip.start + clip.duration);

        // Se o clipe deve estar tocando agora
        if (isVisible && isPlaying) {
            let entry = audioPool.get(clip.id);

            // Cria elemento se não existir ou se a fonte mudou
            if (!entry || entry.src !== clip.src) {
                if (entry && entry.el) entry.el.pause();

                const el = new Audio(clip.src);
                el.muted = false;
                el.crossOrigin = "anonymous";
                el.volume = clip.volume !== undefined ? clip.volume : 1.0;

                // Roteamento de Canal (Stereo Separation) via Web Audio API
                let nodes = null;
                if (window.audioCtx && (clip.channel === 'left' || clip.channel === 'right')) {
                    try {
                        const source = window.audioCtx.createMediaElementSource(el);
                        const splitter = window.audioCtx.createChannelSplitter(2);
                        const merger = window.audioCtx.createChannelMerger(2);

                        source.connect(splitter);
                        const chIdx = clip.channel === 'right' ? 1 : 0;
                        // Mapeia o canal selecionado para ambas as saídas (Mono Dual)
                        splitter.connect(merger, chIdx, 0);
                        splitter.connect(merger, chIdx, 1);
                        merger.connect(window.audioCtx.destination);
                        nodes = { source, splitter, merger };
                    } catch (e) {
                        console.warn("AudioContext routing failed, falling back to basic audio", e);
                    }
                }

                entry = { el, src: clip.src, nodes };
                audioPool.set(clip.id, entry);
            }

            const targetTime = (clip.offset || 0) + (globalTime - clip.start);

            // Sincronia de Tempo (Margem de 150ms para evitar picotamento por jitter)
            if (Math.abs(entry.el.currentTime - targetTime) > 0.15) {
                entry.el.currentTime = targetTime;
            }

            // Garante que está tocando com proteção contra AbortError
            if (isPlaying && entry.el.paused) {
                if (!entry.isPlaying) {
                    entry.isPlaying = true;
                    entry.el.play()
                        .then(() => { entry.isPlaying = false; })
                        .catch(e => {
                            entry.isPlaying = false;
                            if (e.name !== 'AbortError') console.warn("Audio play blocked", e);
                        });
                }
            } else if (!isPlaying && !entry.el.paused) {
                entry.el.pause();
            }
        } else {
            // Se o clipe NÃO deve estar tocando
            const entry = audioPool.get(clip.id);
            if (entry && !entry.el.paused) {
                entry.el.pause();
            }
        }
    });

    // Limpeza de cache (Garbage Collection do Pool)
    // Remove do pool elementos de clips que não existem mais no estado
    const currentClipIds = new Set(window.state.clips.map(c => c.id));
    for (const [clipId, entry] of audioPool.entries()) {
        if (!currentClipIds.has(clipId)) {
            entry.el.pause();
            entry.el.src = "";
            // Desconecta nós do AudioContext para evitar memory leak
            if (entry.nodes) {
                entry.nodes.source.disconnect();
                entry.nodes.splitter.disconnect();
                entry.nodes.merger.disconnect();
            }
            audioPool.delete(clipId);
        }
    }
}

/**
 * Função original mantida para compatibilidade
 */
export async function drawWaveform(videoEl, canvasEl) {
    if (!videoEl.src) return;
    const buffer = await getAudioBuffer(videoEl.src);
    drawBufferWaveform(canvasEl, buffer, '#00e5ff');
}
