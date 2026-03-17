// effects.js
// Sistema de efeitos de áudio e vídeo
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { state } from './state.js';
import { showToast } from './file-operations.js';
import { el, createSVG } from './dom-utils.js';

// Efeitos de Áudio
export const AUDIO_EFFECTS = {
    fadeIn: {
        name: 'Fade In',
        icon: () => createSVG('0 0 24 24', ['M11 5L6 9H2v6h4l5 4V5z', 'M15.54 8.46a5 5 0 010 7.07'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        apply: (clipId, duration = 2) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'fadeIn', duration });
                showToast('Fade In aplicado', 'success', 2000);
            }
        }
    },
    fadeOut: {
        name: 'Fade Out',
        icon: () => createSVG('0 0 24 24', ['M11 5L6 9H2v6h4l5 4V5z', 'M23 9l-6 6M17 9l6 6'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        apply: (clipId, duration = 2) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'fadeOut', duration });
                showToast('Fade Out aplicado', 'success', 2000);
            }
        }
    },
    normalize: {
        name: 'Normalizar',
        icon: () => createSVG('0 0 24 24', ['M3 3v18h18', 'M18 17V9M14 17v-3M10 17v-7M6 17v-5'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        apply: (clipId) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'normalize', target: 0.9 });
                showToast('Normalização aplicada', 'success', 2000);
            }
        }
    },
    compressor: {
        name: 'Compressor',
        icon: () => {
            const svg = createSVG('0 0 24 24', ['M12 8v8'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 });
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '3'); rect.setAttribute('y', '3');
            rect.setAttribute('width', '18'); rect.setAttribute('height', '18');
            rect.setAttribute('rx', '2');
            svg.insertBefore(rect, svg.firstChild);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M8 12h8');
            svg.appendChild(path);
            return svg;
        },
        apply: (clipId) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({
                    type: 'compressor',
                    threshold: -24,
                    ratio: 12,
                    attack: 0.003,
                    release: 0.25
                });
                showToast('Compressor aplicado', 'success', 2000);
            }
        }
    }
};

// Efeitos de Vídeo
export const VIDEO_EFFECTS = {
    brightness: {
        name: 'Brilho/Contraste',
        icon: () => createSVG('0 0 24 24', [
            'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'
        ], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        apply: (clipId, brightness = 1.2, contrast = 1.1) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'brightness', brightness, contrast });
                showToast('Brilho/Contraste aplicado', 'success', 2000);
            }
        }
    },
    saturation: {
        name: 'Saturação',
        icon: () => createSVG('0 0 24 24', ['M12 2.69l5.66 5.66a8 8 0 11-11.31 0z'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        apply: (clipId, saturation = 1.3) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'saturation', saturation });
                showToast('Saturação aplicada', 'success', 2000);
            }
        }
    },
    blur: {
        name: 'Desfoque',
        icon: () => createSVG('0 0 24 24', [], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }), // circle logic below
        apply: (clipId, blur = 3) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'blur', blur });
                showToast('Desfoque aplicado', 'success', 2000);
            }
        }
    },
    grayscale: {
        name: 'Preto e Branco',
        icon: () => createSVG('0 0 24 24', ['M12 2v20'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        apply: (clipId) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'grayscale' });
                showToast('Preto e Branco aplicado', 'success', 2000);
            }
        }
    },
    sepia: {
        name: 'Sépia',
        icon: () => createSVG('0 0 24 24', ['M9 9h6v6H9z'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        apply: (clipId) => {
            const clip = state.clips.find(c => c.id === clipId);
            if (clip) {
                if (!clip.effects) clip.effects = [];
                clip.effects.push({ type: 'sepia' });
                showToast('Sépia aplicado', 'success', 2000);
            }
        }
    }
};

// Adiciona círculos ao ícone de desfoque e brilho
VIDEO_EFFECTS.blur.icon = () => {
    const svg = createSVG('0 0 24 24', [], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 });
    [10, 6, 2].forEach(r => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', String(r));
        svg.appendChild(c);
    });
    return svg;
};
VIDEO_EFFECTS.brightness.icon = () => {
    const svg = createSVG('0 0 24 24', [
        'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'
    ], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 });
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '5');
    svg.insertBefore(c, svg.firstChild);
    return svg;
};
VIDEO_EFFECTS.grayscale.icon = () => {
    const svg = createSVG('0 0 24 24', ['M12 2v20'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 });
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '10');
    svg.insertBefore(c, svg.firstChild);
    return svg;
};
VIDEO_EFFECTS.sepia.icon = () => {
    const svg = createSVG('0 0 24 24', ['M9 9h6v6H9z'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 });
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', '3'); r.setAttribute('y', '3'); r.setAttribute('width', '18'); r.setAttribute('height', '18'); r.setAttribute('rx', '2');
    svg.insertBefore(r, svg.firstChild);
    return svg;
};

export function showEffectsPanel(clipId = null, initialTab = 'audio') {
    const panel = el('div', { className: 'side-panel effects-panel' });

    // HEADER
    const header = el('div', { className: 'panel-header' }, [
        el('h4', {}, [
            createSVG('0 0 24 24', ['13 2 3 14 12 14 11 22 21 10 12 10 13 2'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }), // polygon needs array of points but createSVG expects path d
            el('span', { textContent: ' Efeitos' })
        ]),
        el('button', { className: 'btn-close', onClick: () => panel.remove() }, [
            createSVG('0 0 24 24', ['M18 6L6 18', 'M6 6l12 12'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 })
        ])
    ]);
    // Fix polygon in header
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '13 2 3 14 12 14 11 22 21 10 12 10 13 2');
    header.querySelector('h4 svg').replaceChildren(); // Clear and add polygon
    header.querySelector('h4 svg').appendChild(poly);

    panel.appendChild(header);

    // TABS
    const tabAudio = el('button', { className: `tab ${initialTab === 'audio' ? 'active' : ''}`, 'data-tab': 'audio' }, [
        createSVG('0 0 24 24', ['M11 5L6 9H2v6h4l5 4V5z'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        el('span', { textContent: ' Áudio' })
    ]);
    const tabVideo = el('button', { className: `tab ${initialTab === 'video' ? 'active' : ''}`, 'data-tab': 'video' }, [
        createSVG('0 0 24 24', ['M23 7l-7 5 7 5V7z'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        el('span', { textContent: ' Vídeo' })
    ]);
    // Add rect to video tab svg
    const videoRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    videoRect.setAttribute('x', '1'); videoRect.setAttribute('y', '5'); videoRect.setAttribute('width', '15'); videoRect.setAttribute('height', '14'); videoRect.setAttribute('rx', '2'); videoRect.setAttribute('ry', '2');
    tabVideo.querySelector('svg').appendChild(videoRect);

    const tabs = el('div', { className: 'effects-tabs' }, [tabAudio, tabVideo]);
    panel.appendChild(tabs);

    // CONTENT
    const content = el('div', { className: 'effects-content' });

    // Audio List
    const audioList = el('div', { className: `effects-list ${initialTab === 'audio' ? 'active' : ''}`, 'data-content': 'audio' });
    Object.entries(AUDIO_EFFECTS).forEach(([key, effect]) => {
        const item = el('div', { className: 'effect-item', 'data-effect': key, 'data-type': 'audio' }, [
            el('span', { className: 'effect-icon' }, [effect.icon()]),
            el('span', { className: 'effect-name', textContent: effect.name }),
            el('button', { className: 'btn-apply', textContent: 'Aplicar', onClick: () => AUDIO_EFFECTS[key].apply(clipId || state.selectedClipId) })
        ]);
        audioList.appendChild(item);
    });

    // Video List
    const videoList = el('div', { className: `effects-list ${initialTab === 'video' ? 'active' : ''}`, 'data-content': 'video' });
    Object.entries(VIDEO_EFFECTS).forEach(([key, effect]) => {
        const item = el('div', { className: 'effect-item', 'data-effect': key, 'data-type': 'video' }, [
            el('span', { className: 'effect-icon' }, [effect.icon()]),
            el('span', { className: 'effect-name', textContent: effect.name }),
            el('button', { className: 'btn-apply', textContent: 'Aplicar', onClick: () => VIDEO_EFFECTS[key].apply(clipId || state.selectedClipId) })
        ]);
        videoList.appendChild(item);
    });

    content.appendChild(audioList);
    content.appendChild(videoList);
    panel.appendChild(content);

    document.body.appendChild(panel);

    // Tab switching
    [tabAudio, tabVideo].forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            [tabAudio, tabVideo].forEach(t => t.classList.remove('active'));
            [audioList, videoList].forEach(l => l.classList.remove('active'));
            btn.classList.add('active');
            if (tabName === 'audio') audioList.classList.add('active');
            else videoList.classList.add('active');
        });
    });
}
