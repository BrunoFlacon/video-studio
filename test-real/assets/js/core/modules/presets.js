// presets.js
// Gerenciador de Presets de Efeitos e Configurações
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { state } from './state.js';
import { showToast } from './file-operations.js';
import { AUDIO_EFFECTS, VIDEO_EFFECTS } from './effects.js';
import { el, createSVG } from './dom-utils.js';

const PRESETS = {
    'podcast-voice': {
        name: 'Voz de Podcast',
        icon: '🎙️',
        type: 'audio',
        effects: [
            { id: 'compressor', params: {} },
            { id: 'normalize', params: {} }
        ]
    },
    'cinema-look': {
        name: 'Cinema Look',
        icon: '🎬',
        type: 'video',
        effects: [
            { id: 'saturation', params: { saturation: 1.2 } },
            { id: 'brightness', params: { contrast: 1.15 } }
        ]
    },
    'vintage': {
        name: 'Vintage / Retrô',
        icon: '🎞️',
        type: 'video',
        effects: [
            { id: 'sepia', params: {} },
            { id: 'brightness', params: { brightness: 0.9 } }
        ]
    },
    'radio-voice': {
        name: 'Voz de Rádio',
        icon: '📻',
        type: 'audio',
        effects: [
            { id: 'compressor', params: { ratio: 20 } },
            { id: 'equalizer', params: { high: 1.2, low: 0.8 } }
        ]
    }
};

export function showPresetsPanel() {
    const panel = el('div', { className: 'side-panel presets-panel' });

    // HEADER
    const header = el('div', { className: 'panel-header' }, [
        el('h4', {}, [
            createSVG('0 0 24 24', [], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
            el('span', { textContent: ' Biblioteca de Presets' })
        ]),
        el('button', { className: 'btn-close', onClick: () => panel.remove() }, [
            createSVG('0 0 24 24', ['M18 6L6 18', 'M6 6l12 12'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 })
        ])
    ]);
    // Add rects to header icon
    const headerSvg = header.querySelector('h4 svg');
    [[3, 3], [14, 3], [14, 14], [3, 14]].forEach(([x, y]) => {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
        r.setAttribute('width', '7'); r.setAttribute('height', '7');
        headerSvg.appendChild(r);
    });

    panel.appendChild(header);

    // CONTENT
    const grid = el('div', { className: 'presets-grid' });
    Object.entries(PRESETS).forEach(([key, preset]) => {
        const card = el('div', { className: 'preset-card', 'data-key': key }, [
            el('div', { className: 'preset-icon', textContent: preset.icon }),
            el('div', { className: 'preset-name', textContent: preset.name }),
            el('div', { className: 'preset-type', textContent: preset.type === 'audio' ? 'Áudio' : 'Vídeo' }),
            el('button', {
                className: 'btn-apply-preset', textContent: 'Aplicar', onClick: () => {
                    applyPreset(key);
                    showToast(`Preset "${PRESETS[key].name}" aplicado!`, 'success', 2000);
                }
            })
        ]);
        grid.appendChild(card);
    });

    panel.appendChild(el('div', { className: 'panel-content' }, [grid]));
    document.body.appendChild(panel);
}

function applyPreset(key) {
    const preset = PRESETS[key];
    const clipId = state.selectedClipId;

    if (!clipId) {
        showToast('Selecione um clip primeiro!', 'warning', 2000);
        return;
    }

    const clip = state.clips.find(c => c.id === clipId);
    if (!clip) return;

    if (preset.type !== 'all' && !clip.type.includes(preset.type)) {
        showToast(`Este preset é para clips de ${preset.type}`, 'warning', 3000);
        return;
    }

    preset.effects.forEach(eff => {
        if (preset.type === 'audio' && AUDIO_EFFECTS[eff.id]) {
            AUDIO_EFFECTS[eff.id].apply(clipId);
        } else if (preset.type === 'video' && VIDEO_EFFECTS[eff.id]) {
            if (eff.id === 'saturation') VIDEO_EFFECTS.saturation.apply(clipId, eff.params.saturation);
            else if (eff.id === 'brightness') VIDEO_EFFECTS.brightness.apply(clipId, eff.params.brightness, eff.params.contrast);
            else VIDEO_EFFECTS[eff.id].apply(clipId);
        }
    });
}
