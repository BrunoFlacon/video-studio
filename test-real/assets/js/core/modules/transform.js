/**
 * transform.js — Painel de Propriedades (Inspector) e Motor de Transformação
 * CSP-Safe: Construção 100% via DOM API (zero innerHTML)
 * 
 * Este módulo é responsável por:
 * 1. Exibir o painel flutuante de propriedades do clipe selecionado
 * 2. Aplicar transformações (escala, rotação, posição, opacidade)
 * 3. Gerenciar Keyframes
 * 4. Aplicar Auto Reframe (Smart Fill)
 */

import { state, notifyChange } from './state.js';

let activePanel = null;
let isDragging = false;
let dragState = { startX: 0, startY: 0, initialLeft: 0, initialTop: 0 };

// ─── Helpers para construção DOM (CSP-safe) ───

function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
        Object.keys(attrs).forEach(key => {
            if (key === 'className') node.className = attrs[key];
            else if (key === 'textContent') node.textContent = attrs[key];
            else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
            else node.setAttribute(key, attrs[key]);
        });
    }
    if (children) {
        (Array.isArray(children) ? children : [children]).forEach(child => {
            if (typeof child === 'string') node.appendChild(document.createTextNode(child));
            else if (child) node.appendChild(child);
        });
    }
    return node;
}

function createOption(value, text, selected) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    if (selected) opt.selected = true;
    return opt;
}

// ─── Construção do Painel (CSP-safe, zero innerHTML) ───

function buildPanel(clip) {
    const panel = el('div', { id: 'transformPanel', className: 'floating-panel' });

    // Header (draggable)
    const header = el('div', { className: 'panel-header draggable-handle' });
    header.appendChild(el('span', { textContent: '🎨 Transformação' }));
    const closeBtn = el('button', { className: 'btn-close-small', type: 'button', 'aria-label': 'Fechar painel' });
    closeBtn.appendChild(document.createTextNode('\u00D7'));
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Body
    const body = el('div', { className: 'panel-body' });

    // Sliders
    const sliders = [
        { id: 't-scale', label: 'Escala (Zoom)', min: '0.1', max: '5', step: '0.01', key: 'scale' },
        { id: 't-rotate', label: 'Rotação (°)', min: '-180', max: '180', step: '1', key: 'rotate' },
        { id: 't-x', label: 'Posição X', min: '-1000', max: '1000', step: '1', key: 'x' },
        { id: 't-y', label: 'Posição Y', min: '-1000', max: '1000', step: '1', key: 'y' },
        { id: 't-opacity', label: 'Opacidade', min: '0', max: '1', step: '0.01', key: 'opacity' }
    ];

    sliders.forEach(s => {
        const row = el('div', { className: 'control-row' });
        row.appendChild(el('label', { for: s.id, textContent: s.label }));

        const input = el('input', {
            type: 'range', id: s.id,
            min: s.min, max: s.max, step: s.step,
            value: String(clip.transform[s.key])
        });
        row.appendChild(input);

        const valueSpan = el('span', { id: 'v-' + s.key, textContent: String(clip.transform[s.key]) });
        row.appendChild(valueSpan);
        body.appendChild(row);
    });

    // Espelhamento (dentro do painel, simplificado)
    const flipRow = el('div', { className: 'control-row' });
    flipRow.appendChild(el('span', { className: 'label-text', textContent: 'Espelhamento' }));
    const flipGroup = el('div', { className: 'btn-group' });

    const btnFlipH = el('button', {
        id: 'btnFlipH', type: 'button',
        className: 'btn-toggle' + (clip.transform.flipH ? ' active' : ''),
        title: 'Inverter Horizontal'
    });
    btnFlipH.appendChild(document.createTextNode('\u2194'));
    flipGroup.appendChild(btnFlipH);

    const btnFlipV = el('button', {
        id: 'btnFlipV', type: 'button',
        className: 'btn-toggle' + (clip.transform.flipV ? ' active' : ''),
        title: 'Inverter Vertical'
    });
    btnFlipV.appendChild(document.createTextNode('\u2195'));
    flipGroup.appendChild(btnFlipV);

    flipRow.appendChild(flipGroup);
    body.appendChild(flipRow);

    // Blend Mode
    const blendRow = el('div', { className: 'control-row' });
    blendRow.appendChild(el('label', { for: 't-blend', textContent: 'Mistura (Blend)' }));
    const blendSelect = el('select', { id: 't-blend', className: 'mini-select' });
    [
        { v: 'normal', t: 'Normal' },
        { v: 'multiply', t: 'Multiplicar' },
        { v: 'screen', t: 'Tela' },
        { v: 'overlay', t: 'Sobrepor' }
    ].forEach(o => {
        blendSelect.appendChild(createOption(o.v, o.t, clip.transform.blendMode === o.v));
    });
    blendRow.appendChild(blendSelect);
    body.appendChild(blendRow);

    // Actions
    const actions = el('div', { className: 'panel-actions' });
    actions.appendChild(el('button', { id: 'btnAddKeyframe', className: 'btn-action mini', type: 'button', textContent: '➕ Keyframe' }));
    actions.appendChild(el('button', { id: 'btnAutoReframe', className: 'btn-action mini', type: 'button', title: 'Ajusta escala para preencher o canvas (Smart Fill)', textContent: '📺 Auto Reframe' }));
    actions.appendChild(el('button', { id: 'btnResetTransform', className: 'btn-action mini', type: 'button', textContent: '🔄 Reset' }));
    body.appendChild(actions);

    panel.appendChild(body);
    return panel;
}

// ─── API Pública ───

/**
 * Exibe o painel de propriedades para o clipe selecionado.
 * Se já estiver aberto, apenas atualiza os valores.
 */
export function showTransformPanel(clipId) {
    const clip = state.clips.find(c => c.id === (clipId || state.selectedClipId));
    if (!clip) return;

    if (activePanel) {
        updatePanelValues(clip);
        return;
    }

    const panel = buildPanel(clip);
    document.body.appendChild(panel);
    activePanel = panel;

    setupDraggable(panel);
    setupEvents(panel, clip);
}

/**
 * Fecha o painel de propriedades
 */
export function closeTransformPanel() {
    if (activePanel) {
        activePanel.remove();
        activePanel = null;
    }
}

// ─── Atualização de Valores ───

function updatePanelValues(clip) {
    if (!activePanel) return;

    const ids = ['scale', 'rotate', 'x', 'y', 'opacity'];
    ids.forEach(k => {
        const input = activePanel.querySelector('#t-' + k);
        const span = activePanel.querySelector('#v-' + k);
        if (input) input.value = clip.transform[k];
        if (span) span.textContent = String(clip.transform[k]);
    });

    const blendSel = activePanel.querySelector('#t-blend');
    if (blendSel) blendSel.value = clip.transform.blendMode;

    const btnFlipH = activePanel.querySelector('#btnFlipH');
    const btnFlipV = activePanel.querySelector('#btnFlipV');
    if (btnFlipH) btnFlipH.classList.toggle('active', !!clip.transform.flipH);
    if (btnFlipV) btnFlipV.classList.toggle('active', !!clip.transform.flipV);
}

// ─── Draggable (CSP-safe: usa addEventListener) ───

function setupDraggable(panel) {
    const handle = panel.querySelector('.draggable-handle');
    if (!handle) return;

    function onMouseDown(e) {
        isDragging = true;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        dragState.initialLeft = panel.offsetLeft;
        dragState.initialTop = panel.offsetTop;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
        if (!isDragging) return;
        panel.style.left = (dragState.initialLeft + (e.clientX - dragState.startX)) + 'px';
        panel.style.top = (dragState.initialTop + (e.clientY - dragState.startY)) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    handle.addEventListener('mousedown', onMouseDown);
}

// ─── Eventos do Painel ───

function setupEvents(panel, clip) {
    // Fechar
    const closeBtn = panel.querySelector('.btn-close-small');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.remove();
            activePanel = null;
        });
    }

    // Sliders e Select
    const inputs = panel.querySelectorAll('input[type="range"], select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const key = input.id.replace('t-', '');
            let value = input.value;

            if (input.type === 'range') {
                value = parseFloat(value);
                const label = panel.querySelector('#v-' + key);
                if (label) label.textContent = String(value);
            }

            if (key === 'blend') {
                clip.transform.blendMode = value;
            } else {
                clip.transform[key] = value;
            }
            notifyChange('render');
        });
    });

    // Reset
    const resetBtn = panel.querySelector('#btnResetTransform');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            clip.transform = { scale: 1, rotate: 0, x: 0, y: 0, opacity: 1, blendMode: 'normal', flipH: false, flipV: false };
            updatePanelValues(clip);
            notifyChange('render');
        });
    }

    // Keyframe
    const kfBtn = panel.querySelector('#btnAddKeyframe');
    if (kfBtn) {
        kfBtn.addEventListener('click', () => {
            const globalTime = window.globalTime || 0;
            const localTime = globalTime - clip.start;

            clip.keyframes = clip.keyframes.filter(k => Math.abs(k.time - localTime) > 0.05);
            clip.keyframes.push({
                time: localTime,
                properties: JSON.parse(JSON.stringify(clip.transform))
            });
            clip.keyframes.sort((a, b) => a.time - b.time);

            import('./file-operations.js').then(m => {
                m.showToast('Keyframe adicionado: ' + localTime.toFixed(2) + 's', 'success');
            }).catch(() => { });
            notifyChange('render');
        });
    }

    // Auto Reframe (dentro do painel)
    const arBtn = panel.querySelector('#btnAutoReframe');
    if (arBtn) {
        arBtn.addEventListener('click', () => {
            applyAutoReframe(clip);
        });
    }

    // Flip H
    const flipH = panel.querySelector('#btnFlipH');
    if (flipH) {
        flipH.addEventListener('click', () => {
            clip.transform.flipH = !clip.transform.flipH;
            updatePanelValues(clip);
            notifyChange('render');
        });
    }

    // Flip V
    const flipV = panel.querySelector('#btnFlipV');
    if (flipV) {
        flipV.addEventListener('click', () => {
            clip.transform.flipV = !clip.transform.flipV;
            updatePanelValues(clip);
            notifyChange('render');
        });
    }
}

// ─── Auto Reframe (Smart Fill) ───

/**
 * Aplica lógica de Reenquadramento Inteligente (Cover)
 */
export function applyAutoReframe(clip) {
    if (!clip) {
        clip = state.clips.find(c => c.id === state.selectedClipId);
    }
    if (!clip || !state.projectSettings) return;

    const projectW = state.projectSettings.width;
    const projectH = state.projectSettings.height;
    const projectRatio = projectW / projectH;

    // Reset posição (centraliza)
    clip.transform.x = 0;
    clip.transform.y = 0;

    if (projectRatio < 1) {
        // Projeto Vertical (9:16) → escala para cobrir
        clip.transform.scale = 1.78;
    } else if (projectRatio === 1) {
        // Quadrado
        clip.transform.scale = 1.35;
    } else {
        // Horizontal — fit normal
        clip.transform.scale = 1;
    }

    updatePanelValues(clip);
    notifyChange('render');

    import('./file-operations.js').then(m => {
        m.showToast('Reenquadramento inteligente aplicado', 'info');
    }).catch(() => { });
}

// ─── Triggers Externos (para toolbar e atalhos) ───

/**
 * Espelhamento rápido (horizontal) — não abre o painel
 */
export function triggerMirror(clipId) {
    const clip = state.clips.find(c => c.id === (clipId || state.selectedClipId));
    if (!clip) return;

    clip.transform.flipH = !clip.transform.flipH;
    notifyChange('render');

    // Se o painel estiver aberto, atualiza os valores
    if (activePanel) updatePanelValues(clip);
}

/**
 * Auto Reframe rápido — não abre o painel automaticamente
 */
export function triggerAutoReframe(clipId) {
    const clip = state.clips.find(c => c.id === (clipId || state.selectedClipId));
    if (!clip) return;
    applyAutoReframe(clip);
}
