// file-operations.js
// Gerencia operações de arquivo: auto-save, projetos recentes, importar/exportar

import { state, saveState, loadState } from './state.js';

// ==================== CONSTANTS ====================
const RECENT_PROJECTS_KEY = 'live_cut_recent_projects';
const AUTO_SAVE_INTERVAL = 300000; // 5 minutes in milliseconds
const MAX_RECENT_PROJECTS = 20;

// ==================== AUTO-SAVE SYSTEM ====================
let autoSaveInterval = null;

export function startAutoSave() {
    // Clear existing interval if any
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }

    // Start auto-save every 5 minutes
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

    // Check if project already exists
    const existingIndex = recent.findIndex(p => p.name === projectName);
    if (existingIndex !== -1) {
        // Move to top
        recent.splice(existingIndex, 1);
    }

    // Add new project at beginning
    recent.unshift({
        name: projectName,
        timestamp: Date.now(),
        clipsCount: projectData?.clips?.length || state.clips.length,
        duration: projectData?.duration || state.duration
    });

    // Keep only last 20
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

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content recent-projects-modal">
            <h3>📂 Projetos Recentes</h3>
            <div class="recent-projects-list">
                ${recent.map((proj, idx) => `
                    <div class="recent-project-item" data-index="${idx}">
                        <div class="project-info">
                            <span class="project-name">${escapeHtml(proj.name)}</span>
                            <div class="project-meta">
                                <span class="project-clips">${proj.clipsCount || 0} clips</span>
                                <span class="project-date">${formatDate(proj.timestamp)}</span>
                            </div>
                        </div>
                        <button class="btn-icon project-delete" data-index="${idx}" title="Remover">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button class="btn-secondary modal-close">Fechar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelectorAll('.recent-project-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.project-delete')) return; // Ignore delete button

            const idx = parseInt(item.dataset.index);
            const project = recent[idx];

            // For now, just show message - full implementation would load the project
            showToast(`Carregando: ${project.name}`, 'info', 2000);

            modal.remove();
        });
    });

    // Delete buttons
    modal.querySelectorAll('.project-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            deleteRecentProject(idx);
            modal.remove();
            showRecentProjectsModal(); // Refresh
        });
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
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
    const explorerType = state.projectSettings?.explorer || 'native';

    // Se a preferência for usar o explorador nativo do editor (CUSTOM UI), mostrar modal.
    // Caso contrário, poderíamos usar a File System Access API se disponível, 
    // mas vamos simplificar: o modal atual É o "Editor Explorer".
    // "Native" significaria que o browser lida com tudo (padrão).
    const currentName = document.getElementById('projectName')?.value || 'Projeto.xml';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content save-as-modal">
            <h3>💾 Salvar Projeto Como</h3>
            <div class="form-group">
                <label for="saveAsName">Nome do Arquivo:</label>
                <input type="text" id="saveAsName" name="save_as_name" class="modal-input" value="${escapeHtml(currentName)}" />
            </div>
            <div class="form-group">
                <label for="saveAsFormat">Formato:</label>
                <select id="saveAsFormat" name="save_as_format" class="modal-select">
                    <option value="xml" ${state.projectSettings?.explorer === 'native' ? 'selected' : ''}>XML (Sistema Nativo)</option>
                    <option value="json">JSON (Backup Interno)</option>
                </select>
            </div>
            <div class="form-group mb-16">
                <label class="checkbox-option">
                    <input type="checkbox" id="checkUseCustomExplorer" name="use_custom_explorer" ${state.projectSettings?.explorer === 'editor' ? 'checked' : ''}>
                    <div>
                        <span>Usar Explorador do Editor</span>
                        <small>Interface customizada para gerenciamento de arquivos.</small>
                    </div>
                </label>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary modal-cancel">Cancelar</button>
                <button class="btn-primary modal-save">💾 Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const nameInput = modal.querySelector('#saveAsName');
    nameInput.focus();
    nameInput.select();

    modal.querySelector('.modal-save').addEventListener('click', () => {
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
    });

    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Enter to save
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            modal.querySelector('.modal-save').click();
        }
    });
}

// ==================== EXPORT PROJECT ====================

export function exportProject(name, format) {
    const projectState = {
        version: '1.1', // Increment version
        name: name,
        clips: state.clips,
        tracks: state.tracks,
        duration: state.duration,
        zoom: state.zoom,
        overlays: state.overlays || [],
        markers: state.markers || [], // Adiciona marcadores ao XML
        // Otimização: No XML, salvamos apenas as últimas 15 entradas do histórico 
        // para manter o arquivo leve e o carregamento rápido. O histórico completo
        // permanece no localStorage durante a sessão.
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

    // Ensure extension
    if (!name.endsWith(`.${extension}`)) {
        name += `.${extension}`;
    }

    // Create download
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);

    addToRecentProjects(name, projectState);
    showToast(`Projeto exportado: ${name}`, 'success', 3000);
    // 
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
    // Clear current state
    state.clips = [];
    state.overlays = [];

    // Load new data
    if (projectData.clips) {
        state.clips = projectData.clips;
    }
    if (projectData.tracks) {
        state.tracks = projectData.tracks;
    }
    if (projectData.duration) {
        state.duration = projectData.duration;
    }
    if (projectData.zoom) {
        state.zoom = projectData.zoom;
    }
    if (projectData.overlays) {
        state.overlays = projectData.overlays;
    }
    if (projectData.markers) {
        state.markers = projectData.markers;
    }
    if (projectData.projectSettings) {
        state.projectSettings = { ...state.projectSettings, ...projectData.projectSettings };
    }

    // Update project name
    if (projectData.name) {
        const projectNameInput = document.getElementById('projectName');
        if (projectNameInput) {
            projectNameInput.value = projectData.name;
        }
    }

    // Trigger re-render
    const renderEvent = new Event('render');
    document.dispatchEvent(renderEvent);

    // Restore History if available
    if (projectData.history && window.historyManager) {
        window.historyManager.setHistory(projectData.history, projectData.history.length - 1);
    }
}

/**
 * Abre um modal para o usuário selecionar um novo arquivo para um clipe offline
 */
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

        // Dispara render através do state
        const renderEvent = new Event('render');
        document.dispatchEvent(renderEvent);
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

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        throw new Error('XML inválido');
    }

    const project = doc.querySelector('project');
    if (!project) {
        throw new Error('Formato de projeto inválido');
    }

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
        offline: clip.getAttribute('src')?.startsWith('blob:') // Blobs são sempre offline na importação
    }));

    const markers = Array.from(project.querySelectorAll('marker')).map(m => ({
        time: parseFloat(m.getAttribute('time')),
        note: m.getAttribute('note') || ''
    }));

    const overlays = Array.from(project.querySelectorAll('overlay')).map(o => ({
        id: o.getAttribute('id'),
        type: o.getAttribute('type'),
        content: o.getAttribute('content'),
        start: parseFloat(o.getAttribute('start')),
        duration: parseFloat(o.getAttribute('duration')),
        x: parseFloat(o.getAttribute('x')),
        y: parseFloat(o.getAttribute('y'))
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
        tracks,
        clips,
        markers,
        overlays,
        history
    };
}

// ==================== TOAST NOTIFICATIONS ====================

export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('toast-show'), 10);

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
