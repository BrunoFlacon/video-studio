// temp-cleanup.js
// Gerenciamento e limpeza automática de arquivos temporários
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { showToast } from './file-operations.js';
import { el, createSVG } from './dom-utils.js';

export class TempCleanupManager {
    constructor() {
        this.CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once a day
        this.SHORT_TERM_DAYS = 7;
        this.LONG_TERM_DAYS = 30;
    }

    init() {
        setTimeout(() => this.checkAndCleanup(), 5000);
        setInterval(() => this.checkAndCleanup(), this.CHECK_INTERVAL);
    }

    async checkAndCleanup() {
        const lastCheck = localStorage.getItem('last_cleanup_check');
        const now = Date.now();

        if (lastCheck && (now - parseInt(lastCheck)) < this.CHECK_INTERVAL) {
            return;
        }

        let cleanedCount = 0;
        let freedSpace = 0;

        const waveformKeys = this.getKeysStartingWith('waveform_cache_');
        waveformKeys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.timestamp) {
                    const ageDays = (now - data.timestamp) / (1000 * 60 * 60 * 24);
                    if (ageDays > this.SHORT_TERM_DAYS) {
                        const size = localStorage.getItem(key).length;
                        localStorage.removeItem(key);
                        cleanedCount++;
                        freedSpace += size;
                    }
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        });

        localStorage.setItem('last_cleanup_check', now.toString());

        if (cleanedCount > 0) {
            const sizeMB = (freedSpace / (1024 * 1024)).toFixed(2);
            showToast(`Limpeza automática: ${sizeMB}MB liberados`, 'success', 4000);
        }
    }

    getKeysStartingWith(prefix) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                keys.push(key);
            }
        }
        return keys;
    }

    getStorageUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += localStorage.getItem(key).length;
        }
        return total;
    }

    showCleanupDialog() {
        const usageBytes = this.getStorageUsage();
        const usageMB = (usageBytes / (1024 * 1024)).toFixed(2);
        const percent = Math.min(100, (usageBytes / (5 * 1024 * 1024)) * 100).toFixed(1);

        const modal = el('div', { className: 'modal-overlay' });
        const content = el('div', { className: 'modal-content cleanup-modal' }, [
            el('h3', {}, [
                createSVG('0 0 24 24', ['M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2', 'M10 11v6', 'M14 11v6'], { width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
                el('span', { textContent: ' Gerenciamento de Armazenamento' })
            ]),

            el('div', { className: 'storage-stats info-box p-12 mb-20' }, [
                el('div', { className: 'flex-between mb-20', style: { marginBottom: '8px' } }, [
                    el('span', { textContent: 'Uso do LocalStorage' }),
                    el('strong', { textContent: `${usageMB} MB` })
                ]),
                el('div', { className: 'progress-bar' }, [
                    el('div', { className: 'progress-fill', style: { width: `${percent}%` } })
                ]),
                el('div', { className: 'font-sm text-muted text-right', textContent: `Aprox. ${percent}% da quota padrão` })
            ]),

            el('div', { className: 'cleanup-options' }, [
                el('label', { className: 'checkbox-option', htmlFor: 'cleanCache' }, [
                    el('input', { type: 'checkbox', id: 'cleanCache', checked: 'checked' }),
                    el('div', {}, [
                        el('span', { textContent: 'Limpar cache de waveforms' }),
                        el('small', { className: 'text-muted', textContent: 'Remove dados de visualização de áudio antigos' })
                    ])
                ]),
                el('label', { className: 'checkbox-option', htmlFor: 'cleanHistory' }, [
                    el('input', { type: 'checkbox', id: 'cleanHistory' }),
                    el('div', {}, [
                        el('span', { textContent: 'Limpar histórico de projetos antigos' }),
                        el('small', { className: 'text-muted', textContent: 'Remove registros de undo/redo de sessões passadas' })
                    ])
                ])
            ]),

            el('div', { className: 'modal-actions' }, [
                el('button', { className: 'btn-secondary modal-cancel', textContent: 'Cancelar', onClick: () => modal.remove() }),
                el('button', {
                    className: 'btn-primary modal-clean danger-bg', textContent: 'Limpar Agora', onClick: () => {
                        const cleanCache = modal.querySelector('#cleanCache').checked;
                        const cleanHistory = modal.querySelector('#cleanHistory').checked;
                        let freed = 0;
                        if (cleanCache) {
                            const keys = this.getKeysStartingWith('waveform_cache_');
                            keys.forEach(k => {
                                freed += localStorage.getItem(k).length;
                                localStorage.removeItem(k);
                            });
                        }
                        if (cleanHistory) {
                            localStorage.removeItem('live_cut_history_meta');
                        }
                        const freedMB = (freed / (1024 * 1024)).toFixed(2);
                        showToast(`Limpeza manual concluída: ${freedMB}MB liberados`, 'success', 3000);
                        modal.remove();
                    }
                })
            ])
        ]);

        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
}

export const tempCleanup = new TempCleanupManager();
