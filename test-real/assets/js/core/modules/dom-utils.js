/**
 * dom-utils.js — Utilitários para manipulação do DOM
 * CSP-Safe: Alternativa ao innerHTML
 */

/**
 * Cria um elemento DOM de forma programática e segura.
 * @param {string} tag - Tag do elemento
 * @param {Object} attrs - Atributos e eventos (className, textContent, id, onClick, etc)
 * @param {Array|Node|string} children - Filhos do elemento
 * @returns {HTMLElement}
 */
export function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
        Object.keys(attrs).forEach(key => {
            if (key === 'className') {
                node.className = attrs[key];
            } else if (key === 'textContent') {
                node.textContent = attrs[key];
            } else if (key === 'id') {
                node.id = attrs[key];
            } else if (key === 'htmlFor') {
                node.setAttribute('for', attrs[key]);
            } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
                const eventName = key.slice(2).toLowerCase();
                node.addEventListener(eventName, attrs[key]);
            } else if (key === 'style' && typeof attrs[key] === 'object') {
                Object.assign(node.style, attrs[key]);
            } else {
                node.setAttribute(key, attrs[key]);
            }
        });
    }
    if (children) {
        const childrenArray = Array.isArray(children) ? children : [children];
        childrenArray.forEach(child => {
            if (child === null || child === undefined) return;
            if (typeof child === 'string' || typeof child === 'number') {
                node.appendChild(document.createTextNode(String(child)));
            } else {
                node.appendChild(child);
            }
        });
    }
    return node;
}

/**
 * Escapa texto para HTML sem usar innerHTML.
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML; // O navegador retorna o texto escapado com segurança no innerHTML de saída
}

/**
 * Cria um SVG NS element.
 */
export function createSVG(viewBox, paths, attrs = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', viewBox);
    if (attrs.width) svg.setAttribute('width', attrs.width);
    if (attrs.height) svg.setAttribute('height', attrs.height);
    if (attrs.className) svg.setAttribute('class', attrs.className);

    // Suporta path data como string ou array de strings
    const pathArray = Array.isArray(paths) ? paths : [paths];
    pathArray.forEach(d => {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', d);
        if (attrs.fill) path.setAttribute('fill', attrs.fill);
        if (attrs.stroke) path.setAttribute('stroke', attrs.stroke);
        if (attrs.strokeWidth) path.setAttribute('stroke-width', attrs.strokeWidth);
        svg.appendChild(path);
    });

    return svg;
}
