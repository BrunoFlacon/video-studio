/**
 * Módulo de Renderização Real V3
 * Foca em sincronia de quadros e captura de áudio.
 */

export class VideoRenderer {
    constructor(state, options = {}) {
        this.state = state;
        this.resolution = options.resolution || 'fullhd';
        this.progress = 0;
        this.onProgress = options.onProgress || (() => { });

        const resMap = {
            'hd': { w: 1280, h: 720 },
            'fullhd': { w: 1920, h: 1080 },
            '4k': { w: 3840, h: 2160 },
            'vertical': { w: 1080, h: 1920 }
        };

        this.config = resMap[this.resolution] || resMap['fullhd'];

        // Opções de recorte (para Multi-Slice Export)
        this.startTime = options.startTime || 0;
        this.renderDuration = options.duration || this.state.duration || 5;
    }

    async render() {
        // 1. Setup Canvas para Render OFFSCREEN
        const canvas = document.createElement('canvas');
        canvas.width = this.config.w;
        canvas.height = this.config.h;
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

        // 2. Setup Audio
        const audioCtx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();

        // 3. Combine Streams
        const videoStream = canvas.captureStream(30);
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
        ]);

        // 4. Recorder
        const recorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 12000000 // 12Mbps para qualidade PRO
        });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);

        return new Promise(async (resolve, reject) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };

            recorder.start();

            const fps = 30;
            const totalFrames = Math.ceil(this.renderDuration * fps);

            // Carregar todos os Buffers de áudio antes de começar
            const audioBuffers = new Map();
            for (const clip of this.state.clips) {
                if (clip.type.includes('audio') || clip.type.includes('video')) {
                    const { getAudioBuffer } = await import('./audio.js');
                    const buf = await getAudioBuffer(clip.src);
                    if (buf) audioBuffers.set(clip.id, buf);
                }
            }

            // Loop de Renderização
            for (let f = 0; f < totalFrames; f++) {
                const currentTime = this.startTime + (f / fps);

                // Limpa fundo
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Desenha vídeo
                await this.drawFrame(ctx, currentTime);

                // DISPARA ÁUDIO (Simulado para o tempo do recorder)
                this.playAudioForFrame(audioCtx, dest, currentTime, 1 / fps, audioBuffers);

                this.progress = (f / totalFrames) * 100;
                this.onProgress(this.progress);

                // Sync wait
                await new Promise(r => setTimeout(r, 1000 / fps));
            }

            // Aguarda um pouco para fechar o stream
            setTimeout(() => recorder.stop(), 500);
        });
    }

    async drawFrame(ctx, time) {
        const activeClips = this.state.clips.filter(c =>
            time >= c.start && time <= (c.start + c.duration) && !c.offline
        );

        // Renderiza Clips de Vídeo
        for (const clip of activeClips) {
            if (clip.type.includes('video')) {
                await this.drawVideoClip(ctx, clip, time);
            }
        }

        // Renderiza Overlays de Texto
        for (const clip of activeClips) {
            if (clip.type.includes('text')) {
                this.drawTextClip(ctx, clip, time);
            }
        }
    }

    async drawVideoClip(ctx, clip, time) {
        const video = document.getElementById('previewVideo');
        if (!video) return;

        const timeInClip = (clip.offset || 0) + (time - clip.start);

        // Só muda o tempo se houver diferença significativa (> 33ms)
        if (Math.abs(video.currentTime - timeInClip) > 0.033) {
            video.currentTime = timeInClip;
            await new Promise(r => {
                const onSeek = () => {
                    video.removeEventListener('seeked', onSeek);
                    // Pequeno delay extra para o hardware bufferizar o frame
                    setTimeout(r, 10);
                };
                video.addEventListener('seeked', onSeek);
                setTimeout(r, 150); // Timeout fallback
            });
        }

        ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    playAudioForFrame(ctx, dest, time, duration, buffers) {
        for (const clip of this.state.clips) {
            if (time >= clip.start && time < (clip.start + clip.duration) && !clip.offline) {
                const buffer = buffers.get(clip.id);
                if (buffer) {
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(dest);

                    const offsetInClip = (clip.offset || 0) + (time - clip.start);
                    // Toca apenas o pedaço correspondente a este frame
                    source.start(0, offsetInClip, duration);
                }
            }
        }
    }

    drawTextClip(ctx, clip, time) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 70px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Efeito de sombra premium
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;

        ctx.fillText(clip.content || 'Live-Cut PRO', ctx.canvas.width / 2, ctx.canvas.height / 2);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }
}
