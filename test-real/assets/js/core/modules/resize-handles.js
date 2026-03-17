/**
 * resize-handles.js — Overlay de Redimensionamento Interativo (Estilo CapCut)
 * CSP-Safe: Construção 100% via DOM API (zero innerHTML)
 * 
 * Funcionalidades:
 * - Borda cyan ao redor do vídeo selecionado
 * - 8 handles (4 cantos + 4 lados) para redimensionar
 * - Drag no centro para mover (posição x, y)
 * - Badge com aspect ratio no canto superior esquerdo
 * - Integração com clip.transform (scale, x, y)
 */

import { state, notifyChange } from './state.js';

let overlayEl = null;
let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0, clipX: 0, clipY: 0 };
let resizeStart = { x: 0, y: 0, scale: 1, handle: '' };
let currentClip = null;

// ─── Construção DOM (CSP-safe) ───

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'resizeOverlay';
    overlay.className = 'resize-overlay';

    // Borda cyan (4 lados)
    ['top', 'right', 'bottom', 'left'].forEach(side => {
        const border = document.createElement('div');
        border.className = 'resize-border resize-border-' + side;
        overlay.appendChild(border);
    });

    // 8 Handles
    const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handlePositions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = 'resize-handle resize-handle-' + pos;
        handle.dataset.handle = pos;
        overlay.appendChild(handle);
    });

    // Badge de aspect ratio
    const badge = document.createElement('div');
    badge.className = 'ratio-badge';
    badge.id = 'ratioBadge';
    badge.textContent = '16:9';
    overlay.appendChild(badge);

    return overlay;
}

// ─── Cálculo de Ratio para Badge ───

function getRatioLabel(w, h) {
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const r = gcd(Math.round(w), Math.round(h));
    return `${Math.round(w / r)}:${Math.round(h / r)}`;
}

// ─── Aplicar Transform Visual ao Vídeo ───

export function applyClipTransformToPreview(videoEl, clip) {
    if (!videoEl || !clip || !clip.transform) return;

    const t = clip.transform;
    const parts = [];

    // Posição
    if (t.x !== 0 || t.y !== 0) {
        parts.push(`translate(${t.x}px, ${t.y}px)`);
    }

    // Escala
    if (t.scale !== 1) {
        parts.push(`scale(${t.scale})`);
    }

    // Rotação
    if (t.rotate !== 0) {
        parts.push(`rotate(${t.rotate}deg)`);
    }

    // Flip
    const flipX = t.flipH ? -1 : 1;
    const flipY = t.flipV ? -1 : 1;
    if (flipX !== 1 || flipY !== 1) {
        parts.push(`scale(${flipX}, ${flipY})`);
    }

    videoEl.style.transform = parts.length > 0 ? parts.join(' ') : '';
    videoEl.style.opacity = t.opacity !== undefined ? String(t.opacity) : '1';

    if (t.blendMode && t.blendMode !== 'normal') {
        videoEl.style.mixBlendMode = t.blendMode;
    } else {
        videoEl.style.mixBlendMode = '';
    }
}

// ─── Mouse Handlers ───

function onOverlayMouseDown(e) {
    if (!currentClip) return;

    const handle = e.target.dataset.handle;

    if (handle) {
        // Resize via handle
        isResizing = true;
        resizeStart = {
            x: e.clientX,
            y: e.clientY,
            scale: currentClip.transform.scale,
            handle: handle
        };
        e.preventDefault();
        e.stopPropagation();
    } else if (e.target.classList.contains('resize-overlay') || e.target.classList.contains('resize-border')) {
        // Move via drag
        isDragging = true;
        dragStart = {
            x: e.clientX,
            y: e.clientY,
            clipX: currentClip.transform.x,
            clipY: currentClip.transform.y
        };
        e.preventDefault();
        e.stopPropagation();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
    if (!currentClip) return;

    const videoEl = document.getElementById('previewVideo');
    if (!videoEl) return;

    if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        currentClip.transform.x = dragStart.clipX + dx;
        currentClip.transform.y = dragStart.clipY + dy;
        applyClipTransformToPreview(videoEl, currentClip);
    }

    if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;

        // Calcula delta baseado na direção do handle
        let delta = 0;
        const h = resizeStart.handle;

        if (h.includes('e') || h.includes('w')) {
            delta = h.includes('e') ? dx : -dx;
        }
        if (h.includes('s') || h.includes('n')) {
            const yDelta = h.includes('s') ? dy : -dy;
            delta = Math.abs(yDelta) > Math.abs(delta) ? yDelta : delta;
        }

        // Sensibilidade: 200px de drag = 1x de scale
        const scaleDelta = delta / 200;
        const newScale = Math.max(0.1, Math.min(5, resizeStart.scale + scaleDelta));

        currentClip.transform.scale = Math.round(newScale * 100) / 100;
        applyClipTransformToPreview(videoEl, currentClip);

        // Atualiza o painel de propriedades se estiver aberto
        const scaleInput = document.getElementById('t-scale');
        const scaleValue = document.getElementById('v-scale');
        if (scaleInput) scaleInput.value = currentClip.transform.scale;
        if (scaleValue) scaleValue.textContent = String(currentClip.transform.scale);
    }
}

function onMouseUp() {
    if (isDragging || isResizing) {
        notifyChange('render');
    }

    isDragging = false;
    isResizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// ─── API Pública ───

/**
 * Mostra o overlay de resize sobre o vídeo no preview.
 * Chamado quando um clipe é selecionado.
 */
export function showResizeOverlay(clipId) {
    const clip = state.clips.find(c => c.id === (clipId || state.selectedClipId));
    if (!clip) {
        hideResizeOverlay();
        return;
    }

    currentClip = clip;

    // Previne duplicatas
    if (!overlayEl) {
        overlayEl = createOverlay();
        overlayEl.addEventListener('mousedown', onOverlayMouseDown, { passive: false });

        const container = document.querySelector('.preview-container');
        if (container) {
            container.appendChild(overlayEl);
        }
    }

    // Atualiza badge
    const settings = state.projectSettings || { width: 1920, height: 1080 };
    const badge = overlayEl.querySelector('#ratioBadge');
    if (badge) {
        badge.textContent = getRatioLabel(settings.width, settings.height);
    }

    // Aplica transform visual ao vídeo
    const videoEl = document.getElementById('previewVideo');
    if (videoEl) {
        applyClipTransformToPreview(videoEl, clip);
    }
}

/**
 * Esconde o overlay de resize
 */
export function hideResizeOverlay() {
    if (overlayEl) {
        overlayEl.remove();
        overlayEl = null;
    }
    currentClip = null;

    // Remove transforms do vídeo
    const videoEl = document.getElementById('previewVideo');
    if (videoEl) {
        videoEl.style.transform = '';
        videoEl.style.opacity = '';
        videoEl.style.mixBlendMode = '';
    }
}

/**
 * Atualiza o overlay sem recriar (ex: quando o preset muda)
 */
export function updateResizeOverlay() {
    if (!overlayEl || !currentClip) return;

    const settings = state.projectSettings || { width: 1920, height: 1080 };
    const badge = overlayEl.querySelector('#ratioBadge');
    if (badge) {
        badge.textContent = getRatioLabel(settings.width, settings.height);
    }

    const videoEl = document.getElementById('previewVideo');
    if (videoEl) {
        applyClipTransformToPreview(videoEl, currentClip);
    }
}
