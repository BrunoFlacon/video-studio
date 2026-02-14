// effects.js
// Sistema de efeitos de áudio e vídeo

import { state } from './state.js';
import { showToast } from './file-operations.js';

// Efeitos de Áudio
export const AUDIO_EFFECTS = {
    fadeIn: {
        name: 'Fade In',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9M14 17v-3M10 17v-7M6 17v-5"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M12 8v8"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>`,
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
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>`,
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

export function showEffectsPanel(clipId = null, initialTab = 'audio') {
    const panel = document.createElement('div');
    panel.className = 'side-panel effects-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Efeitos
            </h4>
            <button class="btn-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="effects-tabs">
            <button class="tab ${initialTab === 'audio' ? 'active' : ''}" data-tab="audio">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                </svg>
                Áudio
            </button>
            <button class="tab ${initialTab === 'video' ? 'active' : ''}" data-tab="video">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                Vídeo
            </button>
        </div>
        
        <div class="effects-content">
            <div class="effects-list ${initialTab === 'audio' ? 'active' : ''}" data-content="audio">
                ${Object.entries(AUDIO_EFFECTS).map(([key, effect]) => `
                    <div class="effect-item" data-effect="${key}" data-type="audio">
                        <span class="effect-icon">${effect.icon}</span>
                        <span class="effect-name">${effect.name}</span>
                        <button class="btn-apply" id="btn-apply-audio-${key}" name="apply_audio_effect" aria-label="Aplicar ${effect.name}">Aplicar</button>
                    </div>
                `).join('')}
            </div>
            
            <div class="effects-list ${initialTab === 'video' ? 'active' : ''}" data-content="video">
                ${Object.entries(VIDEO_EFFECTS).map(([key, effect]) => `
                    <div class="effect-item" data-effect="${key}" data-type="video">
                        <span class="effect-icon">${effect.icon}</span>
                        <span class="effect-name">${effect.name}</span>
                        <button class="btn-apply" id="btn-apply-video-${key}" name="apply_video_effect" aria-label="Aplicar ${effect.name}">Aplicar</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // Tab switching
    panel.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            panel.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            panel.querySelectorAll('.effects-list').forEach(l => l.classList.remove('active'));
            tab.classList.add('active');
            panel.querySelector(`[data-content="${tabName}"]`).classList.add('active');
        });
    });

    // Apply effects
    panel.querySelectorAll('.btn-apply').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.effect-item');
            const effectKey = item.dataset.effect;
            const effectType = item.dataset.type;

            if (effectType === 'audio') {
                AUDIO_EFFECTS[effectKey].apply(clipId || state.selectedClipId);
            } else {
                VIDEO_EFFECTS[effectKey].apply(clipId || state.selectedClipId);
            }
        });
    });

    // Close button
    panel.querySelector('.btn-close').addEventListener('click', () => panel.remove());
}
