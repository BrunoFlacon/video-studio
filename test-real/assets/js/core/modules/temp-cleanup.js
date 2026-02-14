// temp-cleanup.js
// Gerenciamento e limpeza automática de arquivos temporários

import { showToast } from './file-operations.js';

export class TempCleanupManager {
    constructor() {
        this.CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once a day
        this.SHORT_TERM_DAYS = 7;
        this.LONG_TERM_DAYS = 30;
    }

    init() {
        // Run check on startup
        setTimeout(() => this.checkAndCleanup(), 5000); // Wait 5s after boot

        // Schedule periodic checks
        setInterval(() => this.checkAndCleanup(), this.CHECK_INTERVAL);
    }

    async checkAndCleanup() {
        const lastCheck = localStorage.getItem('last_cleanup_check');
        const now = Date.now();

        // Only run full check if it hasn't run today
        if (lastCheck && (now - parseInt(lastCheck)) < this.CHECK_INTERVAL) {
            return;
        }



        let cleanedCount = 0;
        let freedSpace = 0;

        // 1. Clean old waveform cache (Short term)
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
                // Corrupted data, remove it
                localStorage.removeItem(key);
            }
        });

        // 2. Clean old history metadata (Long term)
        // (Assuming we might store multiple history snapshots in future)

        // 3. Clean Project Drafts/Auto-saves older than 30 days
        // (If we implement multiple auto-saves)

        localStorage.setItem('last_cleanup_check', now.toString());

        if (cleanedCount > 0) {
            const sizeMB = (freedSpace / (1024 * 1024)).toFixed(2);
            showToast(`Limpeza automática: ${sizeMB}MB liberados`, 'success', 4000);
        } else {

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
        return total; // in bytes (approximate, since strings are UTF-16)
    }

    showCleanupDialog() {
        const usageBytes = this.getStorageUsage();
        const usageMB = (usageBytes / (1024 * 1024)).toFixed(2);
        const percent = Math.min(100, (usageBytes / (5 * 1024 * 1024)) * 100).toFixed(1); // Assuming 5MB limit

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content cleanup-modal">
                <h3>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Gerenciamento de Armazenamento
                </h3>
                
                <div class="storage-stats info-box p-12 mb-20">
                    <div class="flex-between mb-20" style="margin-bottom: 8px;">
                        <span>Uso do LocalStorage</span>
                        <strong>${usageMB} MB</strong>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%;"></div>
                    </div>
                    <div class="font-sm text-muted text-right">
                        Aprox. ${percent}% da quota padrão
                    </div>
                </div>
                
                <div class="cleanup-options">
                    <label class="checkbox-option" for="cleanCache">
                        <input type="checkbox" id="cleanCache" name="clean_cache" checked />
                        <div>
                            <span>Limpar cache de waveforms</span>
                            <small class="text-muted">Remove dados de visualização de áudio antigos</small>
                        </div>
                    </label>
                    <label class="checkbox-option" for="cleanHistory">
                        <input type="checkbox" id="cleanHistory" name="clean_history" />
                        <div>
                            <span>Limpar histórico de projetos antigos</span>
                            <small class="text-muted">Remove registros de undo/redo de sessões passadas</small>
                        </div>
                    </label>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary modal-cancel">Cancelar</button>
                    <button class="btn-primary modal-clean danger-bg">
                        Limpar Agora
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-clean').addEventListener('click', () => {
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
                // Clear implementation-specific history keys if needed
                localStorage.removeItem('live_cut_history_meta');
            }

            const freedMB = (freed / (1024 * 1024)).toFixed(2);
            showToast(`Limpeza manual concluída: ${freedMB}MB liberados`, 'success', 3000);
            modal.remove();
        });

        modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
}

export const tempCleanup = new TempCleanupManager();
