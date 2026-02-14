// history.js
// Sistema completo de histórico de edições (Undo/Redo)

import { state, loadState } from './state.js';
import { showToast } from './file-operations.js';

export class HistoryManager {
    constructor() {
        this.stack = [];
        this.index = -1;
        this.maxSize = 100; // Limite de ações no histórico
    }

    // Registra uma nova ação no histórico
    addAction(actionType, description, data = null) {
        // Se estivermos no meio da stack (após undo), remove o futuro
        if (this.index < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.index + 1);
        }

        const entry = {
            id: crypto.randomUUID(),
            type: actionType,
            description: description,
            timestamp: Date.now(),
            state: this.captureState(),
            data: data
        };

        this.stack.push(entry);

        // Mantém o tamanho limite
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        } else {
            this.index++;
        }

        // Notifica mudança p/ a UI (Sincroniza botões Undo/Redo)
        document.dispatchEvent(new Event('historyChanged'));

        // Salva persistência temporária
        this.saveToTemp();
    }

    // Captura o estado atual do projeto
    captureState() {
        return {
            clips: JSON.parse(JSON.stringify(state.clips)),
            tracks: JSON.parse(JSON.stringify(state.tracks)),
            overlays: state.overlays ? JSON.parse(JSON.stringify(state.overlays)) : [],
            duration: state.duration,
            zoom: state.zoom,
            projectSettings: state.projectSettings // Include settings
        };
    }

    // Desfaz a última ação
    undo() {
        if (this.index >= 0) {
            const entry = this.stack[this.index];
            // Para desfazer, precisamos ir para o estado ANTERIOR a este entry
            // Se index for 0, o estado anterior é o estado inicial (vazio ou default)? 
            // Na verdade, undo deve restaurar o estado *antes* da ação atual ser aplicada.
            // Mas nossa implementação salva o estado *após* a ação.
            // Correção: o snapshot deve ser tirado *antes*? Ou a stack guarda estados completos?
            // Neste modelo simples, restauramos o estado do índice anterior.

            if (this.index === 0) {
                // Se estamos no primeiro item, undo significa "limpar tudo" ou estado inicial?
                // Vamos simplificar: undo move index para tras e restaura aquele estado.
                // Mas se salvamos o estado resultante, index-1 é o estado anterior.
            }

            this.index--;

            if (this.index >= 0) {
                const prevEntry = this.stack[this.index];
                this.restoreState(prevEntry.state);
                showToast(`Desfeito: ${entry.description}`, 'info', 1500);
            } else {
                // Estado zero/inicial
                showToast(`Desfeito: ${entry.description}`, 'info', 1500);
            }

            document.dispatchEvent(new Event('historyChanged'));
            return entry;
        } else {
            showToast('Nada para desfazer', 'warning', 1500);
            return null;
        }
    }

    // Refaz a ação desfeita
    redo() {
        if (this.index < this.stack.length - 1) {
            this.index++;
            const entry = this.stack[this.index];
            this.restoreState(entry.state);
            showToast(`Refeito: ${entry.description}`, 'info', 1500);

            document.dispatchEvent(new Event('historyChanged'));
            return entry;
        } else {
            showToast('Nada para refazer', 'warning', 1500);
            return null;
        }
    }

    // Restaura um estado específico
    restoreState(savedState) {
        state.clips = JSON.parse(JSON.stringify(savedState.clips));
        state.tracks = JSON.parse(JSON.stringify(savedState.tracks));
        state.overlays = savedState.overlays ? JSON.parse(JSON.stringify(savedState.overlays)) : [];
        state.duration = savedState.duration;
        state.zoom = savedState.zoom;
        if (savedState.projectSettings) state.projectSettings = savedState.projectSettings;

        // Força re-renderização
        const event = new Event('render');
        document.dispatchEvent(event);

        // Atualiza UI
        const eventUI = new CustomEvent('stateRestored', { detail: savedState });
        document.dispatchEvent(eventUI);
    }

    saveToTemp() {
        try {
            const data = {
                stack: this.stack.map(e => ({
                    id: e.id,
                    type: e.type,
                    description: e.description,
                    timestamp: e.timestamp
                })),
                index: this.index
            };
            localStorage.setItem('live_cut_history_meta', JSON.stringify(data));
        } catch (e) {
            // Silently fail history save
        }
    }

    // --- NOVAS FUNÇÕES DE LIMPEZA ---

    clearHistory() {
        this.stack = [];
        this.index = -1;
        this.saveToTemp();
        showToast('Histórico limpo', 'success', 2000);
    }

    removeAction(id) {
        const idx = this.stack.findIndex(e => e.id === id);
        if (idx !== -1) {
            this.stack.splice(idx, 1);
            // Ajusta index
            if (idx <= this.index) {
                this.index--;
            }
            this.saveToTemp();
            showToast('Ação removida', 'info', 1500);
        }
    }

    showHistoryPanel() {
        // Remove existente
        document.querySelector('.history-panel')?.remove();

        const panel = document.createElement('div');
        panel.className = 'side-panel history-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h4>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Histórico
                </h4>
                <div class="panel-actions">
                     <button class="btn-clear-history btn-icon-only" title="Limpar Tudo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                    <button class="btn-close">✕</button>
                </div>
            </div>
            
            <div class="history-list">
                ${this.stack.map((entry, idx) => `
                    <div class="history-item ${idx === this.index ? 'active' : ''} ${idx > this.index ? 'future' : ''}">
                        <div class="history-content" data-index="${idx}">
                            <div class="history-icon">${this.getActionIcon(entry.type)}</div>
                            <div class="history-info">
                                <div class="history-action">${entry.description}</div>
                                <div class="history-time">${this.formatTime(entry.timestamp)}</div>
                            </div>
                        </div>
                        <button class="btn-delete-action btn-icon-only" data-id="${entry.id}" title="Remover">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `).join('')}
                ${this.stack.length === 0 ? '<div class="history-empty">Nenhuma ação registrada</div>' : ''}
            </div>
        `;

        document.body.appendChild(panel);

        // Events
        panel.querySelector('.btn-close').addEventListener('click', () => panel.remove());

        // Jump
        panel.querySelectorAll('.history-content').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                if (idx !== this.index) {
                    this.jumpTo(idx);
                    // Não fecha, só atualiza classe active visualmente se quisesse, 
                    // mas jumpTo força restoreState que pode disparar render... 
                    // Vamos fechar e reabrir para atualizar a lista
                    panel.remove();
                    this.showHistoryPanel();
                }
            });
        });

        // Delete Single
        panel.querySelectorAll('.btn-delete-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeAction(btn.dataset.id);
                // Refresh list keeping panel open (simple way: reopen)
                panel.remove();
                this.showHistoryPanel();
            });
        });

        // Clear All
        panel.querySelector('.btn-clear-history').addEventListener('click', () => {
            if (confirm('Limpar todo o histórico?')) {
                this.clearHistory();
                panel.remove();
                this.showHistoryPanel();
            }
        });
    }

    jumpTo(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.stack.length) return;
        const entry = this.stack[targetIndex];
        this.restoreState(entry.state);
        this.index = targetIndex;
        // saveToTemp();
    }

    getActionIcon(type) {
        const icons = {
            'add-clip': '➕',
            'delete-clip': '🗑️',
            'split-clip': '✂️',
            'move-clip': '↔️',
            'effect': '⚡',
            'text': '🅰️',
            'lower-third': '📺',
            'import': '📥',
            'resize': '📏',
            'add-layer': '📑'
        };
        return icons[type] || '📝';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Carrega um histórico externo (usado na importação de projetos)
    setHistory(stack, index) {
        if (Array.isArray(stack)) {
            this.stack = stack;
            this.index = typeof index === 'number' ? index : stack.length - 1;
            this.saveToTemp();
        }
    }
}

export const history = new HistoryManager();
