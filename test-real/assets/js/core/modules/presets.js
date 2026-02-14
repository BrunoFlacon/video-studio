// presets.js
// Gerenciador de Presets de Efeitos e Configurações

import { state } from './state.js';
import { showToast } from './file-operations.js';
import { AUDIO_EFFECTS, VIDEO_EFFECTS } from './effects.js';

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
            { id: 'equalizer', params: { high: 1.2, low: 0.8 } } // Mock param
        ]
    }
};

export function showPresetsPanel() {
    const panel = document.createElement('div');
    panel.className = 'side-panel presets-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Biblioteca de Presets
            </h4>
            <button class="btn-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="panel-content">
            <div class="presets-grid">
                ${Object.entries(PRESETS).map(([key, preset]) => `
                    <div class="preset-card" data-key="${key}">
                        <div class="preset-icon">${preset.icon}</div>
                        <div class="preset-name">${preset.name}</div>
                        <div class="preset-type">${preset.type === 'audio' ? 'Áudio' : 'Vídeo'}</div>
                        <button class="btn-apply-preset">Aplicar</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // Close
    panel.querySelector('.btn-close').addEventListener('click', () => panel.remove());

    // Apply
    panel.querySelectorAll('.btn-apply-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.preset-card');
            const key = card.dataset.key;
            applyPreset(key);
            showToast(`Preset "${PRESETS[key].name}" aplicado!`, 'success', 2000);
        });
    });
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

    // Aplica os efeitos
    preset.effects.forEach(eff => {
        if (preset.type === 'audio' && AUDIO_EFFECTS[eff.id]) {
            AUDIO_EFFECTS[eff.id].apply(clipId);
            // Note: In a real impl, we would pass params too. 
            // Currently our effect.apply() mostly uses defaults or simple params.
        } else if (preset.type === 'video' && VIDEO_EFFECTS[eff.id]) {
            // Mapping specific params if possible
            if (eff.id === 'saturation') VIDEO_EFFECTS.saturation.apply(clipId, eff.params.saturation);
            else if (eff.id === 'brightness') VIDEO_EFFECTS.brightness.apply(clipId, eff.params.brightness, eff.params.contrast);
            else VIDEO_EFFECTS[eff.id].apply(clipId);
        }
    });
}
