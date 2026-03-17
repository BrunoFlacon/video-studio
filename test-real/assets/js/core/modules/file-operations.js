// file-operations.js
// Gerencia operações de arquivo: auto-save, projetos recentes, importar/exportar
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { state, saveState, loadState } from './state.js';
import { el, createSVG } from './dom-utils.js';

// ==================== CONSTANTS ====================
const RECENT_PROJECTS_KEY = 'live_cut_recent_projects';
const AUTO_SAVE_INTERVAL = 300000; // 5 minutes in milliseconds
const MAX_RECENT_PROJECTS = 20;

// ==================== AUTO-SAVE SYSTEM ====================
let autoSaveInterval = null;

export function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    autoSaveInterval = setInterval(() => {
        saveState();
        showToast('Projeto salvo automaticamente', 'success', 2000);
    }, AUTO_SAVE_INTERVAL);
}

export function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// ==================== RECENT PROJECTS ====================

export function addToRecentProjects(projectName, projectData = null) {
    let recent = JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]');
    const existingIndex = recent.findIndex(p => p.name === projectName);
    if (existingIndex !== -1) {
        recent.splice(existingIndex, 1);
    }
    recent.unshift({
        name: projectName,
        timestamp: Date.now(),
        clipsCount: projectData?.clips?.length || state.clips.length,
        duration: projectData?.duration || state.duration
    });
    recent = recent.slice(0, MAX_RECENT_PROJECTS);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recent));
}

export function getRecentProjects() {
    return JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]');
}

export function showRecentProjectsModal() {
    const recent = getRecentProjects();
    if (recent.length === 0) {
        showToast('Nenhum projeto recente encontrado', 'info', 3000);
        return;
    }

    const modal = el('div', { className: 'modal-overlay' });
    const content = el('div', { className: 'modal-content recent-projects-modal' }, [
        el('h3', { textContent: '📂 Projetos Recentes' })
    ]);

    const list = el('div', { className: 'recent-projects-list' });
    recent.forEach((proj, idx) => {
        const item = el('div', {
            className: 'recent-project-item', 'data-index': idx, onClick: (e) => {
                if (e.target.closest('.project-delete')) return;
                showToast(`Carregando: ${proj.name}`, 'info', 2000);
                modal.remove();
            }
        }, [
            el('div', { className: 'project-info' }, [
                el('span', { className: 'project-name', textContent: proj.name }),
                el('div', { className: 'project-meta' }, [
                    el('span', { className: 'project-clips', textContent: `${proj.clipsCount || 0} clips` }),
                    el('span', { className: 'project-date', textContent: formatDate(proj.timestamp) })
                ])
            ]),
            el('button', {
                className: 'btn-icon project-delete',
                title: 'Remover',
                onClick: (e) => {
                    e.stopPropagation();
                    deleteRecentProject(idx);
                    modal.remove();
                    showRecentProjectsModal();
                }
            }, [
                createSVG('0 0 24 24', ['M18 6L6 18', 'M6 6l12 12'], { width: 16, height: 16, stroke: 'currentColor', strokeWidth: 2, fill: 'none' })
            ])
        ]);
        list.appendChild(item);
    });

    content.appendChild(list);
    content.appendChild(el('div', { className: 'modal-actions' }, [
        el('button', { className: 'btn-secondary modal-close', textContent: 'Fechar', onClick: () => modal.remove() })
    ]));

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function deleteRecentProject(index) {
    let recent = getRecentProjects();
    recent.splice(index, 1);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recent));
}

// ==================== SAVE AS DIALOG ====================

export function showSaveAsDialog() {
    const currentName = document.getElementById('projectName')?.value || 'Projeto.xml';

    const modal = el('div', { className: 'modal-overlay' });
    const content = el('div', { className: 'modal-content save-as-modal' }, [
        el('h3', { textContent: '💾 Salvar Projeto Como' }),

        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'saveAsName', textContent: 'Nome do Arquivo:' }),
            el('input', { type: 'text', id: 'saveAsName', className: 'modal-input', value: currentName })
        ]),

        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'saveAsFormat', textContent: 'Formato:' }),
            el('select', { id: 'saveAsFormat', className: 'modal-select' }, [
                el('option', { value: 'xml', textContent: 'XML (Sistema Nativo)', ...(state.projectSettings?.explorer === 'native' ? { selected: 'selected' } : {}) }),
                el('option', { value: 'json', textContent: 'JSON (Backup Interno)' })
            ])
        ]),

        el('div', { className: 'form-group mb-16' }, [
            el('label', { className: 'checkbox-option' }, [
                el('input', { type: 'checkbox', id: 'checkUseCustomExplorer', checked: state.projectSettings?.explorer === 'editor' ? 'checked' : null }),
                el('div', {}, [
                    el('span', { textContent: 'Usar Explorador do Editor' }),
                    el('small', { textContent: 'Interface customizada para gerenciamento de arquivos.' })
                ])
            ])
        ]),

        el('div', { className: 'modal-actions' }, [
            el('button', { className: 'btn-secondary modal-cancel', textContent: 'Cancelar', onClick: () => modal.remove() }),
            el('button', {
                className: 'btn-primary modal-save', textContent: '💾 Salvar', onClick: () => {
                    const name = nameInput.value.trim();
                    const format = modal.querySelector('#saveAsFormat').value;
                    const useCustomExplorer = modal.querySelector('#checkUseCustomExplorer')?.checked;

                    if (state.projectSettings) {
                        state.projectSettings.explorer = useCustomExplorer ? 'editor' : 'native';
                        saveState();
                    }

                    if (!name) {
                        showToast('Digite um nome para o arquivo', 'error', 3000);
                        return;
                    }

                    exportProject(name, format);
                    modal.remove();
                }
            })
        ])
    ]);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const nameInput = modal.querySelector('#saveAsName');
    nameInput.focus();
    nameInput.select();

    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            modal.querySelector('.modal-save').click();
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ==================== EXPORT PROJECT ====================

export function exportProject(name, format) {
    const projectState = {
        version: '1.2', // Increment version
        name: name,
        clips: state.clips,
        tracks: state.tracks,
        duration: state.duration,
        zoom: state.zoom,
        overlays: state.overlays || [],
        markers: state.markers || [],
        history: window.historyManager ? window.historyManager.stack.slice(-15).map(h => ({
            type: h.type,
            description: h.description,
            timestamp: h.timestamp,
            state: h.state
        })) : [],
        exportedAt: new Date().toISOString()
    };

    let data, mimeType, extension;

    if (format === 'xml') {
        data = stateToXML(projectState);
        mimeType = 'text/xml';
        extension = 'xml';
    } else {
        data = JSON.stringify(projectState, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }

    if (!name.endsWith(`.${extension}`)) {
        name += `.${extension}`;
    }

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);

    addToRecentProjects(name, projectState);
    showToast(`Projeto exportado: ${name}`, 'success', 3000);
}

// ==================== IMPORT PROJECT ====================

export async function importProject(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const text = await file.text();

    try {
        let projectData;
        switch (ext) {
            case 'xml':
                projectData = parseXMLProject(text);
                break;
            case 'json':
                projectData = JSON.parse(text);
                break;
            default:
                throw new Error(`Formato não suportado: .${ext}`);
        }
        loadProjectData(projectData);
        addToRecentProjects(file.name, projectData);
        showToast(`Projeto importado: ${file.name}`, 'success', 3000);
    } catch (err) {
        showToast('Erro ao importar projeto. Verifique o formato.', 'error', 4000);
    }
}

function loadProjectData(projectData) {
    state.clips = [];
    state.overlays = [];
    if (projectData.clips) state.clips = projectData.clips;
    if (projectData.tracks) state.tracks = projectData.tracks;
    if (projectData.duration) state.duration = projectData.duration;
    if (projectData.zoom) state.zoom = projectData.zoom;
    if (projectData.overlays) state.overlays = projectData.overlays;
    if (projectData.markers) state.markers = projectData.markers;
    if (projectData.projectSettings) state.projectSettings = { ...state.projectSettings, ...projectData.projectSettings };

    if (projectData.name) {
        const projectNameInput = document.getElementById('projectName');
        if (projectNameInput) projectNameInput.value = projectData.name;
    }

    const renderEvent = new Event('render');
    document.dispatchEvent(renderEvent);

    if (projectData.history && window.historyManager) {
        window.historyManager.setHistory(projectData.history, projectData.history.length - 1);
    }
}

export function relinkMedia(clipId) {
    const clip = state.clips.find(c => c.id === clipId);
    if (!clip) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = clip.type.includes('video') ? 'video/*' : 'audio/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const newUrl = URL.createObjectURL(file);
        clip.src = newUrl;
        clip.offline = false;
        showToast(`Mídia relincada: ${file.name}`, 'success', 2000);
        saveState();
        document.dispatchEvent(new Event('render'));
    };
    input.click();
}

// ==================== XML CONVERSION ====================

function stateToXML(projectState) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<project version="${projectState.version}" name="${escapeXml(projectState.name)}">\n`;
    xml += `  <metadata>\n`;
    xml += `    <duration>${projectState.duration}</duration>\n`;
    xml += `    <zoom>${projectState.zoom}</zoom>\n`;
    xml += `    <exportedAt>${projectState.exportedAt}</exportedAt>\n`;
    xml += `  </metadata>\n`;
    xml += `  <tracks>\n`;
    projectState.tracks.forEach(track => {
        xml += `    <track id="${escapeXml(track.id)}" type="${escapeXml(track.type)}" name="${escapeXml(track.name)}" />\n`;
    });
    xml += `  </tracks>\n`;
    xml += `  <clips>\n`;
    projectState.clips.forEach(clip => {
        xml += `    <clip id="${escapeXml(clip.id)}" name="${escapeXml(clip.name)}" `;
        xml += `src="${escapeXml(clip.src)}" start="${clip.start}" duration="${clip.duration}" `;
        xml += `offset="${clip.offset}" type="${escapeXml(clip.type)}" trackId="${escapeXml(clip.trackId)}" `;
        xml += `exportName="${escapeXml(clip.exportName || '')}" />\n`;
    });
    xml += `  </clips>\n`;
    xml += `  <markers>\n`;
    (projectState.markers || []).forEach(m => {
        const time = typeof m === 'number' ? m : m.time;
        const note = typeof m === 'number' ? '' : (m.note || '');
        xml += `    <marker time="${time}" note="${escapeXml(note)}" />\n`;
    });
    xml += `  </markers>\n`;
    xml += `  <overlays>\n`;
    (projectState.overlays || []).forEach(o => {
        xml += `    <overlay id="${escapeXml(o.id)}" type="${escapeXml(o.type)}" content="${escapeXml(o.content)}" `;
        xml += `start="${o.start}" duration="${o.duration}" x="${o.x}" y="${o.y}" />\n`;
    });
    xml += `  </overlays>\n`;
    xml += `  <history_log>\n`;
    (projectState.history || []).forEach(h => {
        const stateStr = JSON.stringify(h.state);
        xml += `    <action type="${escapeXml(h.type)}" description="${escapeXml(h.description)}" timestamp="${h.timestamp}">\n`;
        xml += `      <state_data><![CDATA[${stateStr}]]></state_data>\n`;
        xml += `    </action>\n`;
    });
    xml += `  </history_log>\n`;
    xml += `</project>`;
    return xml;
}

function parseXMLProject(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) throw new Error('XML inválido');
    const project = doc.querySelector('project');
    if (!project) throw new Error('Formato de projeto inválido');

    const metadata = project.querySelector('metadata');
    const tracks = Array.from(project.querySelectorAll('track')).map(track => ({
        id: track.getAttribute('id'),
        type: track.getAttribute('type'),
        name: track.getAttribute('name')
    }));
    const clips = Array.from(project.querySelectorAll('clip')).map(clip => ({
        id: clip.getAttribute('id'),
        name: clip.getAttribute('name'),
        src: clip.getAttribute('src'),
        start: parseFloat(clip.getAttribute('start')),
        duration: parseFloat(clip.getAttribute('duration')),
        offset: parseFloat(clip.getAttribute('offset')),
        type: clip.getAttribute('type'),
        trackId: clip.getAttribute('trackId'),
        exportName: clip.getAttribute('exportName') || '',
        offline: clip.getAttribute('src')?.startsWith('blob:')
    }));
    const markers = Array.from(project.querySelectorAll('marker')).map(m => ({
        time: parseFloat(m.getAttribute('time')),
        note: m.getAttribute('note') || ''
    }));
    const history = Array.from(project.querySelectorAll('action')).map(h => {
        const stateData = h.querySelector('state_data')?.textContent;
        return {
            type: h.getAttribute('type'),
            description: h.getAttribute('description'),
            timestamp: parseInt(h.getAttribute('timestamp')),
            state: stateData ? JSON.parse(stateData) : null
        };
    });
    return {
        version: project.getAttribute('version'),
        name: project.getAttribute('name'),
        duration: metadata ? parseFloat(metadata.querySelector('duration')?.textContent) : 60,
        zoom: metadata ? parseFloat(metadata.querySelector('zoom')?.textContent) : 1,
        tracks, clips, markers, history
    };
}

// ==================== TOAST NOTIFICATIONS ====================

export function showToast(message, type = 'info', duration = 3000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = el('div', { className: `toast toast-${type}` }, [
        el('span', { className: 'toast-icon', textContent: icons[type] || icons.info }),
        el('span', { className: 'toast-message', textContent: message })
    ]);

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==================== UTILITY FUNCTIONS ====================

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
