// plugin-import.js
// Sistema de importação de plugins de outras ferramentas
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { showToast } from './file-operations.js';
import { el, createSVG } from './dom-utils.js';

export class PluginImporter {
    static async importPlugin(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        showToast(`Importando plugin: ${file.name}`, 'info', 2000);

        try {
            let plugin;
            switch (ext) {
                case 'prproj':
                case 'xml':
                    plugin = await this.parsePremierePlugin(file);
                    break;
                case 'ccut':
                case 'json':
                    plugin = await this.parseCapCutPlugin(file);
                    break;
                case 'recut':
                    plugin = await this.parseRecutPlugin(file);
                    break;
                case 'drp':
                    plugin = await this.parseDaVinciPlugin(file);
                    break;
                case 'fcpxml':
                    plugin = await this.parseFinalCutPlugin(file);
                    break;
                default:
                    throw new Error(`Formato não suportado: .${ext}`);
            }
            return plugin;
        } catch (err) {
            throw err;
        }
    }

    static async parsePremierePlugin(file) {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        if (doc.querySelector('parsererror')) throw new Error('XML inválido');

        const effects = Array.from(doc.querySelectorAll('effect')).map(effect => ({
            name: effect.getAttribute('name') || 'Unnamed Effect',
            type: effect.getAttribute('type') || 'unknown',
            parameters: Array.from(effect.querySelectorAll('parameter')).map(param => ({
                name: param.getAttribute('name'),
                value: param.getAttribute('value'),
                type: param.getAttribute('type')
            }))
        }));

        return {
            source: 'Adobe Premiere Pro',
            format: file.name.endsWith('.prproj') ? 'prproj' : 'xml',
            effects,
            metadata: {
                version: doc.querySelector('version')?.textContent || 'Unknown',
                effectsCount: effects.length
            }
        };
    }

    static async parseCapCutPlugin(file) {
        const text = await file.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error('JSON inválido');
        }
        const effects = data.effects || data.filters || [];
        return {
            source: 'CapCut',
            format: 'json',
            effects: effects.map(e => ({
                name: e.name || e.title || 'Unnamed',
                type: e.type || 'filter',
                parameters: e.params || e.settings || {}
            })),
            metadata: {
                version: data.version || '1.0',
                effectsCount: effects.length
            }
        };
    }

    static async parseRecutPlugin(file) {
        return { source: 'Recut', format: 'recut', effects: [], metadata: { note: 'Formato parcialmente suportado', size: file.size } };
    }

    static async parseDaVinciPlugin(file) {
        return { source: 'DaVinci Resolve', format: 'drp', effects: [], metadata: { note: 'Formato parcialmente suportado', size: file.size } };
    }

    static async parseFinalCutPlugin(file) {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const effects = Array.from(doc.querySelectorAll('filter-video, filter-audio')).map(effect => ({
            name: effect.getAttribute('name') || 'Unnamed',
            type: effect.tagName.includes('video') ? 'video' : 'audio',
            parameters: []
        }));
        return { source: 'Final Cut Pro', format: 'fcpxml', effects, metadata: { effectsCount: effects.length } };
    }
}

export function showPluginImportDialog() {
    const modal = el('div', { className: 'modal-overlay' });
    const content = el('div', { className: 'modal-content plugin-import-modal' }, [
        el('h3', {}, [
            createSVG('0 0 24 24', ['M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24'], { width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
            el('span', { textContent: ' Importar Plugin de Efeitos' })
        ]),
        // Add circle to header icon manually as path d doesn't support circles easily in my helper
        el('p', { className: 'text-muted mb-20', textContent: 'Suporta: Adobe Premiere, CapCut, Recut, DaVinci Resolve, Final Cut Pro' }),

        el('div', { className: 'form-group' }, [
            el('label', { textContent: 'Selecione o arquivo do plugin:' }),
            el('input', { type: 'file', id: 'pluginInput', className: 'modal-input', accept: '.prproj,.xml,.ccut,.json,.recut,.drp,.fcpxml' })
        ]),

        el('div', { className: 'plugin-formats info-box mt-16 p-12' }, [
            el('div', { className: 'font-sm text-muted' }, [
                el('strong', { textContent: 'Formatos suportados:' }),
                el('br'),
                el('span', { textContent: '• Adobe Premiere: .prproj, .xml' }), el('br'),
                el('span', { textContent: '• CapCut: .ccut, .json' }), el('br'),
                el('span', { textContent: '• DaVinci Resolve: .drp' }), el('br'),
                el('span', { textContent: '• Final Cut Pro: .fcpxml' }), el('br'),
                el('span', { textContent: '• Recut: .recut' })
            ])
        ]),

        el('div', { className: 'modal-actions' }, [
            el('button', { className: 'btn-secondary modal-cancel', textContent: 'Cancelar', onClick: () => modal.remove() }),
            el('button', {
                className: 'btn-primary modal-import', onClick: async () => {
                    const file = modal.querySelector('#pluginInput').files[0];
                    if (!file) {
                        showToast('Selecione um arquivo', 'warning', 2000);
                        return;
                    }
                    try {
                        const plugin = await PluginImporter.importPlugin(file);
                        const plugins = JSON.parse(localStorage.getItem('imported_plugins') || '[]');
                        plugins.push({ ...plugin, importedAt: Date.now(), fileName: file.name });
                        localStorage.setItem('imported_plugins', JSON.stringify(plugins));
                        showToast(`Plugin importado: ${plugin.source} (${plugin.effects.length} efeitos)`, 'success', 3000);
                        modal.remove();
                    } catch (err) {
                        showToast(`Erro: ${err.message}`, 'error', 3000);
                    }
                }
            }, [
                createSVG('0 0 24 24', ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
                el('span', { textContent: ' Importar' })
            ])
        ])
    ]);

    // Fix header icon
    const headerSvg = content.querySelector('h3 svg');
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '3');
    headerSvg.insertBefore(c, headerSvg.firstChild);

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}
