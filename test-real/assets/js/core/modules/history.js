// history.js
// Sistema completo de histórico de edições (Undo/Redo)
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { state, loadState } from './state.js';
import { showToast } from './file-operations.js';
import { el, createSVG } from './dom-utils.js';

export class HistoryManager {
    constructor() {
        this.stack = [];
        this.index = -1;
        this.maxSize = 100;
    }

    addAction(actionType, description, data = null) {
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
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        } else {
            this.index++;
        }

        document.dispatchEvent(new Event('historyChanged'));
        this.saveToTemp();
    }

    captureState() {
        return {
            clips: JSON.parse(JSON.stringify(state.clips)),
            tracks: JSON.parse(JSON.stringify(state.tracks)),
            overlays: state.overlays ? JSON.parse(JSON.stringify(state.overlays)) : [],
            duration: state.duration,
            zoom: state.zoom,
            projectSettings: state.projectSettings
        };
    }

    undo() {
        if (this.index >= 0) {
            const entry = this.stack[this.index];
            this.index--;
            if (this.index >= 0) {
                const prevEntry = this.stack[this.index];
                this.restoreState(prevEntry.state);
            }
            showToast(`Desfeito: ${entry.description}`, 'info', 1500);
            document.dispatchEvent(new Event('historyChanged'));
            return entry;
        } else {
            showToast('Nada para desfazer', 'warning', 1500);
            return null;
        }
    }

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

    restoreState(savedState) {
        state.clips = JSON.parse(JSON.stringify(savedState.clips));
        state.tracks = JSON.parse(JSON.stringify(savedState.tracks));
        state.overlays = savedState.overlays ? JSON.parse(JSON.stringify(savedState.overlays)) : [];
        state.duration = savedState.duration;
        state.zoom = savedState.zoom;
        if (savedState.projectSettings) state.projectSettings = savedState.projectSettings;

        document.dispatchEvent(new Event('render'));
        document.dispatchEvent(new CustomEvent('stateRestored', { detail: savedState }));
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
        } catch (e) { }
    }

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
            if (idx <= this.index) this.index--;
            this.saveToTemp();
            showToast('Ação removida', 'info', 1500);
        }
    }

    showHistoryPanel() {
        document.querySelector('.history-panel')?.remove();

        const panel = el('div', { className: 'side-panel history-panel' });

        // HEADER
        const header = el('div', { className: 'panel-header' }, [
            el('h4', {}, [
                createSVG('0 0 24 24', ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'], { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
                el('span', { textContent: ' Histórico' })
            ]),
            el('div', { className: 'panel-actions' }, [
                el('button', {
                    className: 'btn-clear-history btn-icon-only', title: 'Limpar Tudo', onClick: () => {
                        if (confirm('Limpar todo o histórico?')) {
                            this.clearHistory();
                            panel.remove();
                            this.showHistoryPanel();
                        }
                    }
                }, [
                    createSVG('0 0 24 24', ['M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'], { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 })
                ]),
                el('button', { className: 'btn-close', onClick: () => panel.remove() }, '✕')
            ])
        ]);
        panel.appendChild(header);

        // LIST
        const list = el('div', { className: 'history-list' });
        if (this.stack.length === 0) {
            list.appendChild(el('div', { className: 'history-empty', textContent: 'Nenhuma ação registrada' }));
        } else {
            this.stack.forEach((entry, idx) => {
                const item = el('div', { className: `history-item ${idx === this.index ? 'active' : ''} ${idx > this.index ? 'future' : ''}` }, [
                    el('div', {
                        className: 'history-content', 'data-index': idx, onClick: () => {
                            if (idx !== this.index) {
                                this.jumpTo(idx);
                                panel.remove();
                                this.showHistoryPanel();
                            }
                        }
                    }, [
                        el('div', { className: 'history-icon', textContent: this.getActionIcon(entry.type) }),
                        el('div', { className: 'history-info' }, [
                            el('div', { className: 'history-action', textContent: entry.description }),
                            el('div', { className: 'history-time', textContent: this.formatTime(entry.timestamp) })
                        ])
                    ]),
                    el('button', {
                        className: 'btn-delete-action btn-icon-only', 'data-id': entry.id, title: 'Remover', onClick: (e) => {
                            e.stopPropagation();
                            this.removeAction(entry.id);
                            panel.remove();
                            this.showHistoryPanel();
                        }
                    }, [
                        createSVG('0 0 24 24', ['M18 6L6 18', 'M6 6l12 12'], { width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 })
                    ])
                ]);
                list.appendChild(item);
            });
        }
        panel.appendChild(list);

        document.body.appendChild(panel);
    }

    jumpTo(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.stack.length) return;
        const entry = this.stack[targetIndex];
        this.restoreState(entry.state);
        this.index = targetIndex;
    }

    getActionIcon(type) {
        const icons = {
            'add-clip': '➕', 'delete-clip': '🗑️', 'split-clip': '✂️', 'move-clip': '↔️',
            'effect': '⚡', 'text': '🅰️', 'lower-third': '📺', 'import': '📥',
            'resize': '📏', 'add-layer': '📑'
        };
        return icons[type] || '📝';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    setHistory(stack, index) {
        if (Array.isArray(stack)) {
            this.stack = stack;
            this.index = typeof index === 'number' ? index : stack.length - 1;
            this.saveToTemp();
        }
    }
}

export const history = new HistoryManager();
