// plugin-import.js
// Sistema de importação de plugins de outras ferramentas

import { showToast } from './file-operations.js';

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

        if (doc.querySelector('parsererror')) {
            throw new Error('XML inválido');
        }

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
        const text = await file.text();

        return {
            source: 'Recut',
            format: 'recut',
            effects: [],
            metadata: {
                note: 'Formato parcialmente suportado',
                size: file.size
            }
        };
    }

    static async parseDaVinciPlugin(file) {
        const text = await file.text();

        return {
            source: 'DaVinci Resolve',
            format: 'drp',
            effects: [],
            metadata: {
                note: 'Formato parcialmente suportado',
                size: file.size
            }
        };
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

        return {
            source: 'Final Cut Pro',
            format: 'fcpxml',
            effects,
            metadata: {
                effectsCount: effects.length
            }
        };
    }
}

export function showPluginImportDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content plugin-import-modal">
            <h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                </svg>
                Importar Plugin de Efeitos
            </h3>
            <p class="text-muted mb-20">
                Suporta: Adobe Premiere, CapCut, Recut, DaVinci Resolve, Final Cut Pro
            </p>
            
            <div class="form-group">
                <label>Selecione o arquivo do plugin:</label>
                <input type="file" id="pluginInput" name="plugin_file" class="modal-input" 
                       accept=".prproj,.xml,.ccut,.json,.recut,.drp,.fcpxml" />
            </div>
            
            <div class="plugin-formats info-box mt-16 p-12">
                <div class="font-sm text-muted">
                    <strong>Formatos suportados:</strong><br>
                    • Adobe Premiere: .prproj, .xml<br>
                    • CapCut: .ccut, .json<br>
                    • DaVinci Resolve: .drp<br>
                    • Final Cut Pro: .fcpxml<br>
                    • Recut: .recut
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn-secondary modal-cancel">Cancelar</button>
                <button class="btn-primary modal-import">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"></path>
                    </svg>
                    Importar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-import').addEventListener('click', async () => {
        const file = modal.querySelector('#pluginInput').files[0];
        if (!file) {
            showToast('Selecione um arquivo', 'warning', 2000);
            return;
        }

        try {
            const plugin = await PluginImporter.importPlugin(file);

            // Store in localStorage
            const plugins = JSON.parse(localStorage.getItem('imported_plugins') || '[]');
            plugins.push({
                ...plugin,
                importedAt: Date.now(),
                fileName: file.name
            });
            localStorage.setItem('imported_plugins', JSON.stringify(plugins));

            showToast(`Plugin importado: ${plugin.source} (${plugin.effects.length} efeitos)`, 'success', 3000);
            modal.remove();

        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error', 3000);
        }
    });

    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}
