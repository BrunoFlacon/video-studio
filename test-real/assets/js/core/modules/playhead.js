import { state } from './state.js';

/**
 * Inicializa a agulha (Playhead) com comportamento de clicar e arrastar
 * @param {HTMLElement} playhead - O elemento visual da agulha
 * @param {HTMLElement} timeline - O container da timeline
 * @param {Function} onSeek - Callback opcional que recebe a posição em % ou PX para atualizar o vídeo
 */
export function initPlayhead(playhead, timeline, onSeek) {
    let isDragging = false;

    // Função interna para calcular e aplicar a posição
    const updatePosition = (clientX) => {
        const rect = timeline.getBoundingClientRect();
        const scrollLeft = timeline.scrollLeft || 0;
        const offset = 80; // Margem das labels fixas

        // Calcula a posição descontando a barra de labels e somando o scroll
        let x = (clientX - rect.left) + scrollLeft;

        // Limita o arraste para não entrar na área das labels
        if (x < offset) x = offset;

        // Limites (Constraints) - Ensure it doesn't go past the end of the scrollable content
        x = Math.min(x, timeline.scrollWidth);

        // --- SNAPPING MAGNÉTICO (Markers) ---
        const pxPerSec = state.pxPerSecond || 0;
        const currentTime = (x - offset) / pxPerSec;
        const snapThreshold = 0 / pxPerSec;

        if (state.markers) {
            const nearestMarker = state.markers.find(m => {
                const mTime = typeof m === 'number' ? m : m.time;
                return Math.abs(mTime - currentTime) < snapThreshold;
            });

            if (nearestMarker) {
                const snapTime = typeof nearestMarker === 'number' ? nearestMarker : nearestMarker.time;
                x = (snapTime * pxPerSec) + offset;
            }
        }

        // Aplica transform para mover o playhead via variável CSS
        playhead.style.setProperty('--playhead-x', `${x}px`);

        // Chama o callback para atualizar o vídeo (Lógica)
        if (onSeek) {
            onSeek(x - offset);
        }
    };

    // 2. Arrastando (MouseMove no document)
    const onDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault(); // Evita seleção de texto
        updatePosition(e.clientX);
    };

    // 3. Parar o arraste (MouseUp no document)
    const stopDrag = () => {
        isDragging = false;
        playhead.classList.remove('dragging'); // Remove estado visual

        // Limpa a memória removendo os listeners
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    };

    // 1. Iniciar o arraste (MouseDown na timeline)
    timeline.addEventListener('mousedown', (e) => {
        isDragging = true;
        playhead.classList.add('dragging');

        // PERFORMANCE: Cache de dimensões no início do drag para evitar layout thrashing no mousemove
        playhead._timelineRect = timeline.getBoundingClientRect();
        playhead._timelineScroll = timeline.scrollLeft;
        playhead._timelineWidth = timeline.scrollWidth;

        updatePosition(e.clientX);

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    });
}
