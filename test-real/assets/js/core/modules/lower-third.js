// lower-third.js
// Sistema de Lower Third com templates profissionais

import { state } from './state.js';
import { showToast } from './file-operations.js';

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
    }

    render() {
        const template = LOWER_THIRD_TEMPLATES[this.template];
        const element = document.createElement('div');
        element.className = `lower-third lower-third-${this.template} position-${this.position}`;
        element.dataset.id = this.id;

        // Atribui estilos programaticamente (Mais seguro para CSP que string inline)
        element.style.background = template.background;
        element.style.color = template.textColor;
        element.style.animation = `${template.animation} 0.6s ease`;

        const content = document.createElement('div');
        content.className = 'lower-third-content';

        const nameEl = document.createElement('div');
        nameEl.className = 'lower-third-name';
        nameEl.style.fontSize = template.fontSize.name;
        nameEl.textContent = this.name;

        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'lower-third-subtitle';
        subtitleEl.style.fontSize = template.fontSize.subtitle;
        subtitleEl.textContent = this.subtitle;

        content.appendChild(nameEl);
        content.appendChild(subtitleEl);
        element.appendChild(content);

        return element;
    }

    showPropertiesPanel() {
        const panel = document.createElement('div');
        panel.className = 'side-panel lower-third-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h4>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                        <polyline points="17 2 12 7 7 2"></polyline>
                    </svg>
                    Lower Third
                </h4>
                <button class="btn-close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="panel-content">
                <div class="form-group">
                    <label for="ltName">Nome:</label>
                    <input type="text" id="ltName" name="lt_name" class="panel-input" value="${escapeHtml(this.name)}" />
                </div>
                
                <div class="form-group">
                    <label for="ltSubtitle">Subtítulo:</label>
                    <input type="text" id="ltSubtitle" name="lt_subtitle" class="panel-input" value="${escapeHtml(this.subtitle)}" />
                </div>

                <div class="form-group">
                    <label for="ltTextColor">Cor do Texto:</label>
                    <input type="color" id="ltTextColor" name="lt_text_color" class="panel-input-color" value="${this.textColor || LOWER_THIRD_TEMPLATES[this.template].textColor}">
                </div>
                
                <div class="form-group">
                    <label for="ltTemplate">Template:</label>
                    <select id="ltTemplate" name="lt_template" class="panel-select">
                        ${Object.keys(LOWER_THIRD_TEMPLATES).map(key => `
                            <option value="${key}" ${key === this.template ? 'selected' : ''}>
                                ${LOWER_THIRD_TEMPLATES[key].name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="ltPosition">Posição:</label>
                    <select id="ltPosition" name="lt_position" class="panel-select">
                        <option value="bottom-left" ${this.position === 'bottom-left' ? 'selected' : ''}>Inferior Esquerda</option>
                        <option value="bottom-right" ${this.position === 'bottom-right' ? 'selected' : ''}>Inferior Direita</option>
                        <option value="top-left" ${this.position === 'top-left' ? 'selected' : ''}>Superior Esquerda</option>
                        <option value="top-right" ${this.position === 'top-right' ? 'selected' : ''}>Superior Direita</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="ltDuration">Duração (segundos):</label>
                    <input type="number" id="ltDuration" name="lt_duration" class="panel-input" value="${this.duration}" min="1" max="30" />
                </div>
                
                <button class="btn-primary btn-full" id="ltApply">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Aplicar
                </button>
            </div>
        `;

        document.body.appendChild(panel);

        // Apply button
        panel.querySelector('#ltApply').addEventListener('click', () => {
            this.name = panel.querySelector('#ltName').value;
            this.subtitle = panel.querySelector('#ltSubtitle').value;
            this.template = panel.querySelector('#ltTemplate').value;
            this.position = panel.querySelector('#ltPosition').value;
            this.duration = parseFloat(panel.querySelector('#ltDuration').value);

            // Update overlay
            const overlayLayer = document.getElementById('overlayLayer');
            const existing = overlayLayer.querySelector(`[data-id="${this.id}"]`);
            if (existing) {
                existing.replaceWith(this.render());
            }

            showToast('Lower Third atualizado', 'success', 2000);
            panel.remove();
        });

        // Close button
        panel.querySelector('.btn-close').addEventListener('click', () => panel.remove());
    }
}

export function addLowerThird(config = {}) {
    const lowerThird = new LowerThird(config);

    // Add to state
    if (!state.overlays) state.overlays = [];
    state.overlays.push(lowerThird);

    // Add to overlay layer
    const overlayLayer = document.getElementById('overlayLayer');
    if (overlayLayer) {
        const element = lowerThird.render();
        overlayLayer.appendChild(element);

        // Make clickable to edit
        element.addEventListener('click', () => {
            lowerThird.showPropertiesPanel();
        });
    }

    // Show properties panel
    lowerThird.showPropertiesPanel();

    showToast('Lower Third adicionado', 'success', 2000);

    return lowerThird;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
