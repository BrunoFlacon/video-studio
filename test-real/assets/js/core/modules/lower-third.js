// lower-third.js
// Sistema de Lower Third com templates profissionais
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { state } from './state.js';
import { showToast } from './file-operations.js';
import { el, createSVG } from './dom-utils.js';

// Templates de Lower Third
const LOWER_THIRD_TEMPLATES = {
    modern: {
        name: 'Modern',
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        textColor: '#ffffff',
        animation: 'slideInLeft',
        fontSize: { name: '1.8rem', subtitle: '1.1rem' }
    },
    minimal: {
        name: 'Minimal',
        background: 'rgba(0, 0, 0, 0.85)',
        textColor: '#ffffff',
        animation: 'fadeIn',
        fontSize: { name: '1.6rem', subtitle: '1rem' }
    },
    corporate: {
        name: 'Corporate',
        background: 'linear-gradient(90deg, #1e293b, #334155)',
        textColor: '#f1f5f9',
        animation: 'slideInBottom',
        fontSize: { name: '1.7rem', subtitle: '1.05rem' }
    },
    vibrant: {
        name: 'Vibrant',
        background: 'linear-gradient(135deg, #ec4899, #f59e0b)',
        textColor: '#ffffff',
        animation: 'scaleIn',
        fontSize: { name: '1.9rem', subtitle: '1.15rem' }
    }
};

export class LowerThird {
    constructor(config = {}) {
        this.id = crypto.randomUUID();
        this.name = config.name || 'Nome';
        this.subtitle = config.subtitle || 'Título';
        this.template = config.template || 'modern';
        this.start = config.start || 0;
        this.duration = config.duration || 5;
        this.position = config.position || 'bottom-left';
        this.textColor = config.textColor || null;
    }

    render() {
        const template = LOWER_THIRD_TEMPLATES[this.template];
        const element = el('div', {
            className: `lower-third lower-third-${this.template} position-${this.position}`,
            style: {
                background: template.background,
                color: this.textColor || template.textColor,
                animation: `${template.animation} 0.6s ease`
            }
        });
        element.dataset.id = this.id;

        const content = el('div', { className: 'lower-third-content' }, [
            el('div', { className: 'lower-third-name', style: { fontSize: template.fontSize.name }, textContent: this.name }),
            el('div', { className: 'lower-third-subtitle', style: { fontSize: template.fontSize.subtitle }, textContent: this.subtitle })
        ]);

        element.appendChild(content);
        return element;
    }

    showPropertiesPanel() {
        const panel = el('div', { className: 'side-panel lower-third-panel' });

        // HEADER
        const header = el('div', { className: 'panel-header' }, [
            el('h4', {}, [
                createSVG('0 0 24 24', ['M17 2l-5 5-5-5'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }), // polyline logic below
                el('span', { textContent: ' Lower Third' })
            ]),
            el('button', { className: 'btn-close', onClick: () => panel.remove() }, [
                createSVG('0 0 24 24', ['M18 6L6 18', 'M6 6l12 12'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 })
            ])
        ]);
        // Specific rect for lower third header
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '2'); rect.setAttribute('y', '7'); rect.setAttribute('width', '20'); rect.setAttribute('height', '15'); rect.setAttribute('rx', '2'); rect.setAttribute('ry', '2');
        header.querySelector('h4 svg').insertBefore(rect, header.querySelector('h4 svg').firstChild);

        panel.appendChild(header);

        // CONTENT
        const content = el('div', { className: 'panel-content' }, [
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ltName', textContent: 'Nome:' }),
                el('input', { type: 'text', id: 'ltName', className: 'panel-input', value: this.name })
            ]),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ltSubtitle', textContent: 'Subtítulo:' }),
                el('input', { type: 'text', id: 'ltSubtitle', className: 'panel-input', value: this.subtitle })
            ]),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ltTextColor', textContent: 'Cor do Texto:' }),
                el('input', { type: 'color', id: 'ltTextColor', className: 'panel-input-color', value: this.textColor || LOWER_THIRD_TEMPLATES[this.template].textColor })
            ]),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ltTemplate', textContent: 'Template:' }),
                el('select', { id: 'ltTemplate', className: 'panel-select' },
                    Object.keys(LOWER_THIRD_TEMPLATES).map(key =>
                        el('option', { value: key, textContent: LOWER_THIRD_TEMPLATES[key].name, ...(key === this.template ? { selected: 'selected' } : {}) })
                    )
                )
            ]),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ltPosition', textContent: 'Posição:' }),
                el('select', { id: 'ltPosition', className: 'panel-select' }, [
                    el('option', { value: 'bottom-left', textContent: 'Inferior Esquerda', ...(this.position === 'bottom-left' ? { selected: 'selected' } : {}) }),
                    el('option', { value: 'bottom-right', textContent: 'Inferior Direita', ...(this.position === 'bottom-right' ? { selected: 'selected' } : {}) }),
                    el('option', { value: 'top-left', textContent: 'Superior Esquerda', ...(this.position === 'top-left' ? { selected: 'selected' } : {}) }),
                    el('option', { value: 'top-right', textContent: 'Superior Direita', ...(this.position === 'top-right' ? { selected: 'selected' } : {}) })
                ])
            ]),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ltDuration', textContent: 'Duração (segundos):' }),
                el('input', { type: 'number', id: 'ltDuration', className: 'panel-input', value: this.duration, min: 1, max: 30 })
            ]),
            el('button', {
                className: 'btn-primary btn-full', id: 'ltApply', onClick: () => {
                    this.name = panel.querySelector('#ltName').value;
                    this.subtitle = panel.querySelector('#ltSubtitle').value;
                    this.template = panel.querySelector('#ltTemplate').value;
                    this.position = panel.querySelector('#ltPosition').value;
                    this.duration = parseFloat(panel.querySelector('#ltDuration').value);
                    this.textColor = panel.querySelector('#ltTextColor').value;

                    const overlayLayer = document.getElementById('overlayLayer');
                    const existing = overlayLayer.querySelector(`[data-id="${this.id}"]`);
                    if (existing) {
                        existing.replaceWith(this.render());
                    }

                    showToast('Lower Third atualizado', 'success', 2000);
                    panel.remove();
                }
            }, [
                createSVG('0 0 24 24', ['M20 6L9 17l-5-5'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
                el('span', { textContent: ' Aplicar' })
            ])
        ]);

        panel.appendChild(content);
        document.body.appendChild(panel);
    }
}

export function addLowerThird(config = {}) {
    const lowerThird = new LowerThird(config);
    if (!state.overlays) state.overlays = [];
    state.overlays.push(lowerThird);

    const overlayLayer = document.getElementById('overlayLayer');
    if (overlayLayer) {
        const element = lowerThird.render();
        overlayLayer.appendChild(element);
        element.addEventListener('click', () => {
            lowerThird.showPropertiesPanel();
        });
    }

    lowerThird.showPropertiesPanel();
    showToast('Lower Third adicionado', 'success', 2000);
    return lowerThird;
}
