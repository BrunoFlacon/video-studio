/**
 * canvas-toolbar.js — Barra Flutuante de Ações Rápidas (Estilo CapCut)
 * CSP-Safe: Construção 100% via DOM API (zero innerHTML)
 * 
 * Aparece acima do vídeo selecionado com botões de ação rápida:
 * Espelhar H, Espelhar V, Recortar (split), Excluir
 */

import { state, notifyChange } from './state.js';

let toolbarEl = null;

// ─── SVG Icons (CSP-safe: criados via createElementNS) ───

function createSVG(paths, viewBox, w, h) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('fill', 'currentColor');
    paths.forEach(d => {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
    });
    return svg;
}

const ICONS = {
    flipH: () => createSVG([
        'M9.464 4.537c.486-.924 1.885-.578 1.885.466v12.952a2 2 0 0 1-2 2H3.005a1 1 0 0 1-.885-1.465L9.464 4.536Z',
        'M15.234 4.537c-.487-.924-1.885-.578-1.885.466v12.953a2 2 0 0 0 2 2h6.343a1 1 0 0 0 .885-1.466L15.234 4.536Z'
    ], '0 0 24 24', 16, 16),
    flipV: () => createSVG([
        'M4.537 14.536c-.924.487-.578 1.885.466 1.885h12.952a2 2 0 0 0 2-2V8.078a1 1 0 0 0-1.465-.885L4.536 14.536Z',
        'M4.537 8.766c-.924-.487-.578-1.885.466-1.885h12.953a2 2 0 0 1 2 2v6.343a1 1 0 0 1-1.466.885L4.536 8.766Z'
    ], '0 0 24 24', 16, 16),
    split: () => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        // Vertical line
        const l1 = document.createElementNS(ns, 'line');
        l1.setAttribute('x1', '12'); l1.setAttribute('y1', '2');
        l1.setAttribute('x2', '12'); l1.setAttribute('y2', '22');
        svg.appendChild(l1);
        // Left arrow
        const p1 = document.createElementNS(ns, 'polyline');
        p1.setAttribute('points', '8 6 4 12 8 18');
        svg.appendChild(p1);
        // Right arrow
        const p2 = document.createElementNS(ns, 'polyline');
        p2.setAttribute('points', '16 6 20 12 16 18');
        svg.appendChild(p2);
        return svg;
    },
    crop: () => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M6 2v14a2 2 0 0 0 2 2h14M2 6h4m12 0v12m0 0h4');
        svg.appendChild(path);
        return svg;
    },
    reframe: () => createSVG([
        'M8.507 14.474a.682.682 0 1 0 .965.965l.655-.654a.682.682 0 0 0-.965-.965l-.655.654Zm5.203-4.238a.682.682 0 0 1 0-.965l.655-.654a.682.682 0 1 1 .965.965l-.655.654a.682.682 0 0 1-.965 0Zm-2.81 2.81a.682.682 0 0 1 0-.964l1.072-1.072a.682.682 0 1 1 .965.964l-1.072 1.072a.682.682 0 0 1-.965 0Z',
        'M17.743 9.392a.19.19 0 0 0 .361-.013 4.61 4.61 0 0 1 3.028-3.131l.15-.048a.193.193 0 0 0-.005-.37l-.064-.019a4.566 4.566 0 0 1-3.11-3.163.188.188 0 0 0-.36-.013l-.068.193a4.852 4.852 0 0 1-3.095 2.997c-.183.059-.182.319 0 .382a5.104 5.104 0 0 1 3.114 3.053l.049.132ZM7.242 5.219h5.896a4.828 4.828 0 0 0 .007 1.914H7.242v8.615c0 .528.428.957.957.957h8.614V10.85a4.816 4.816 0 0 0 1.915.033v5.822h2.688l-.516 1.914h-2.172v2.971l-1.915-.524v-2.447H8.2a2.871 2.871 0 0 1-2.871-2.871V7.133H2.584l.513-1.914h2.23V3.022l1.915-.512v2.709Z'
    ], '0 0 24 24', 16, 16),
    more: () => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('fill', 'currentColor');
        [6, 12, 18].forEach(cx => {
            const c = document.createElementNS(ns, 'circle');
            c.setAttribute('cx', String(cx));
            c.setAttribute('cy', '12');
            c.setAttribute('r', '1.5');
            svg.appendChild(c);
        });
        return svg;
    }
};

// ─── Criação de Botão (CSP-safe) ───

function createToolbarBtn(iconFn, title, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ct-btn';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.appendChild(iconFn());
    btn.addEventListener('click', onClick);
    return btn;
}

// ─── Toolbar Principal ───

/**
 * Mostra a toolbar flutuante sobre o preview do vídeo.
 * Chamado quando um clipe é selecionado.
 * @param {object} callbacks - { onSplit, onDelete, onShowPanel }
 */
export function showCanvasToolbar(callbacks) {
    // Previne duplicatas
    if (toolbarEl) {
        toolbarEl.remove();
        toolbarEl = null;
    }

    const clip = state.clips.find(c => c.id === state.selectedClipId);
    if (!clip) return;

    const bar = document.createElement('div');
    bar.id = 'canvasToolbar';
    bar.className = 'canvas-toolbar';

    // Botões de ação rápida
    bar.appendChild(createToolbarBtn(ICONS.reframe, 'Reenquadramento Inteligente', () => {
        if (callbacks.onAutoReframe) callbacks.onAutoReframe(clip.id);
    }));

    bar.appendChild(createToolbarBtn(ICONS.crop, 'Recortar / Crop', () => {
        if (callbacks.onShowPanel) callbacks.onShowPanel(clip.id);
    }));

    bar.appendChild(createToolbarBtn(ICONS.flipH, 'Espelhar Horizontal', () => {
        clip.transform.flipH = !clip.transform.flipH;
        notifyChange('render');
    }));

    bar.appendChild(createToolbarBtn(ICONS.flipV, 'Espelhar Vertical', () => {
        clip.transform.flipV = !clip.transform.flipV;
        notifyChange('render');
    }));

    bar.appendChild(createToolbarBtn(ICONS.more, 'Mais Opções...', () => {
        if (callbacks.onShowPanel) callbacks.onShowPanel(clip.id);
    }));

    // Insere dentro do workspace (acima do vídeo)
    const workspace = document.querySelector('.workspace');
    if (workspace) {
        workspace.appendChild(bar);
    } else {
        document.body.appendChild(bar);
    }

    toolbarEl = bar;
}

/**
 * Remove a toolbar do DOM (quando nenhum clipe está selecionado)
 */
export function hideCanvasToolbar() {
    if (toolbarEl) {
        toolbarEl.remove();
        toolbarEl = null;
    }
}

/**
 * Retorna se a toolbar está visível
 */
export function isToolbarVisible() {
    return toolbarEl !== null;
}
