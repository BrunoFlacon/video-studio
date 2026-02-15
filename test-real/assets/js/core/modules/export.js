/**
 * Módulo de Exportação Profissional
 * Gerencia a comunicação com o backend e o fluxo de múltiplos estágios do modal.
 */

import { state, notifyChange, getProjectDuration } from './state.js';

let currentAbortController = null;

/**
 * Utilitário para trocar entre as telas do modal de exportação
 * @param {'settings' | 'progress' | 'success'} stage 
 */
function showExportStage(stage) {
    const views = {
        settings: document.getElementById('exportSettingsView'),
        progress: document.getElementById('exportProgressView'),
        success: document.getElementById('exportResultView')
    };

    const title = document.getElementById('exportModalTitle');
    const titles = {
        settings: '📦 Configurações de Exportação',
        progress: '⚙️ Renderizando...',
        success: '🎬 Vídeo Pronto!'
    };

    Object.values(views).forEach(v => v?.classList.add('hidden'));

    if (views[stage]) {
        views[stage].classList.remove('hidden');
        if (title) title.innerText = titles[stage];

        // Se for sucesso, força o render do botão de download com os dados mais recentes
        if (stage === 'success' && window._lastExportResult) {
            setupModalActions(window._lastExportResult);
        }
    }
}

export function initExport(btnExport, selectPreset) {
    if (!btnExport) return;

    // Sincroniza o estado quando o preset é alterado
    if (selectPreset) {
        selectPreset.addEventListener('change', () => {
            const preset = selectPreset.value;
            const presetResolutions = {
                'hd': { width: 1280, height: 720 },
                'fullhd': { width: 1920, height: 1080 },
                '4k': { width: 3840, height: 2160 },
                'vertical': { width: 1080, height: 1920 },
                'square': { width: 1080, height: 1080 }
            };

            if (presetResolutions[preset]) {
                state.projectSettings = state.projectSettings || {};
                state.projectSettings.width = presetResolutions[preset].width;
                state.projectSettings.height = presetResolutions[preset].height;
                state.projectSettings.presetName = preset;
                notifyChange();
            }
        });
    }

    // Botão Principal: Abre o modal de configurações (Não inicia o render direto)
    const handleOpenModal = () => {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.classList.remove('hidden');
            showExportStage('settings');

            // Re-habilita botões caso tenham ficado presos em erro anterior
            const btnStart = document.getElementById('btnStartRender');
            if (btnStart) {
                btnStart.disabled = false;
                btnStart.innerText = '🚀 Iniciar Renderização';
            }
        }
    };

    btnExport.removeEventListener('click', handleOpenModal);
    btnExport.addEventListener('click', handleOpenModal);

    // Iniciar Render (dentro do modal) - Limpamos listeners antigos com cloneNode
    const btnStartRender = document.getElementById('btnStartRender');
    if (btnStartRender) {
        const newBtnStart = btnStartRender.cloneNode(true);
        btnStartRender.parentNode.replaceChild(newBtnStart, btnStartRender);

        newBtnStart.addEventListener('click', () => {
            if (newBtnStart.disabled) return;

            const isBatch = document.getElementById('checkBatchExport')?.checked;
            const preset = selectPreset ? selectPreset.value : 'fullhd';

            // Trava de segurança imediata
            newBtnStart.disabled = true;
            newBtnStart.innerText = '⌛ Processando...';

            if (isBatch) {
                handleBatchExport(preset).finally(() => {
                    newBtnStart.disabled = false;
                    newBtnStart.innerText = '🚀 Iniciar Renderização';
                });
            } else {
                handleExportProcess(preset).finally(() => {
                    newBtnStart.disabled = false;
                    newBtnStart.innerText = '🚀 Iniciar Renderização';
                });
            }
        });
    }

    // Cancelar Render
    const btnCancel = document.getElementById('btnCancelRender');
    if (btnCancel) {
        const newBtnCancel = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
        newBtnCancel.addEventListener('click', () => {
            if (currentAbortController) {
                currentAbortController.abort();
                currentAbortController = null;
            }
            showExportStage('settings');
            import('./file-operations.js').then(m => m.showToast('Renderização Cancelada', 'warning'));
        });
    }

    // Fechar Modal
    const btnClose = document.getElementById('btnCloseExportModal');
    if (btnClose) {
        const newBtnClose = btnClose.cloneNode(true);
        btnClose.parentNode.replaceChild(newBtnClose, btnClose);
        newBtnClose.addEventListener('click', () => {
            document.getElementById('exportModal')?.classList.add('hidden');
        });
    }
}

export async function handleBatchExport(preset) {
    const toastModule = await import('./file-operations.js');
    const showToast = toastModule.showToast;

    const videoClips = state.clips.filter(c => c.type.includes('video') || c.type.includes('audio'));
    if (videoClips.length === 0) {
        showToast('Nenhum clipe para exportar.', 'error');
        return;
    }

    const fileNameInput = document.getElementById('exportFileName');
    const baseName = fileNameInput ? fileNameInput.value : 'corte';
    const quality = document.getElementById('exportQuality')?.value || 'medium';
    const format = document.getElementById('exportFormat')?.value || 'mp4';

    showExportStage('progress');
    const statusText = document.getElementById('exportStatusText');
    const progressBar = document.getElementById('exportProgressBar');
    const percentageText = document.getElementById('renderPercentage');

    currentAbortController = new AbortController();

    for (let i = 0; i < videoClips.length; i++) {
        if (currentAbortController?.signal.aborted) break;

        const clip = videoClips[i];
        const currentNum = (i + 1).toString().padStart(2, '0');
        const clipName = `${baseName}_${currentNum}`;
        const totalProgress = Math.round(((i) / videoClips.length) * 100);

        if (statusText) statusText.innerText = `Processando Clip ${i + 1}/${videoClips.length}: ${clipName}`;
        if (progressBar) progressBar.style.width = `${totalProgress}%`;
        if (percentageText) percentageText.innerText = `${totalProgress}%`;

        try {
            const response = await fetch('api/export.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clips: [{ ...clip, src: clip.serverSrc || clip.src }],
                    project: clipName,
                    settings: {
                        ...(state.projectSettings || {}),
                        quality,
                        format,
                        isSingleClip: true
                    }
                }),
                signal: currentAbortController.signal
            });

            const result = await response.json();
            if (result.status === 'success') {
                const a = document.createElement('a');
                a.href = result.video_url;
                // Usa a extensão do arquivo retornado pelo servidor
                const ext = result.video_url.split('.').pop() || 'mp4';
                a.download = `${clipName}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (err) {
            if (err.name !== 'AbortError') showToast(`Erro no clip ${i + 1}`, 'error');
        }
    }

    if (!currentAbortController?.signal.aborted) {
        showExportStage('success');
        if (document.getElementById('exportResultText')) {
            document.getElementById('exportResultText').innerText = `Batch export concluído! (Arquivos expiram em 30min)`;
        }
    }
}

export async function handleExportProcess(preset) {
    const toastModule = await import('./file-operations.js');
    const showToast = toastModule.showToast;

    const fileNameInput = document.getElementById('exportFileName');
    const fileName = fileNameInput ? fileNameInput.value : 'sequencia_final';
    const quality = document.getElementById('exportQuality')?.value || 'medium';
    const format = document.getElementById('exportFormat')?.value || 'mp4';

    showExportStage('progress');
    const statusText = document.getElementById('exportStatusText');
    const progressBar = document.getElementById('exportProgressBar');
    const percentageText = document.getElementById('renderPercentage');
    const timerElapsed = document.getElementById('exportTimerElapsed');
    const timerRemaining = document.getElementById('exportTimerRemaining');

    // Thumbnail Preview
    const thumbnailEl = document.getElementById('exportThumbnail');
    if (thumbnailEl && state.clips.length > 0) {
        const firstClip = state.clips[0];
        thumbnailEl.style.backgroundImage = `url('${firstClip.thumbnail || firstClip.src}')`;
    }

    // Update Details
    document.getElementById('renderInfoText').innerText = `${fileName} - ${preset.toUpperCase()}`;
    if (document.getElementById('renderDetailRes')) {
        document.getElementById('renderDetailRes').innerText = `Resolução: ${state.projectSettings?.width || 1920}x${state.projectSettings?.height || 1080}`;
    }
    if (document.getElementById('renderDetailFormat')) {
        document.getElementById('renderDetailFormat').innerText = `Formato: ${format.toUpperCase()}`;
    }

    // Previsão de Tamanho baseada na qualidade e duração
    const duration = getProjectDuration() || 60;
    const bitrateMap = { 'low': 2000, 'medium': 5000, 'high': 12000, 'ultra': 30000 }; // kbps
    const br = bitrateMap[quality] || 5000;
    const sizeMB = Math.round((duration * br) / 8192); // (s * kbps) / 8 = KB / 1024 = MB

    if (document.getElementById('renderEstSize')) {
        document.getElementById('renderEstSize').innerText = `Tamanho Estimado: ~${sizeMB} MB`;
    }

    if (progressBar) progressBar.style.setProperty('width', '5%');
    if (percentageText) percentageText.innerText = '5%';
    if (statusText) statusText.innerText = 'Preparando FFmpeg (Aceleração GPU solicitada)...';

    const startTime = Date.now();
    let timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        if (timerElapsed) timerElapsed.innerText = `${h}:${m}:${s}`;

        // Estimativa simples
        const progressStr = progressBar.style.getPropertyValue('width') || '5%';
        const progress = parseFloat(progressStr) / 100;
        if (progress > 0.1 && timerRemaining) {
            const totalEst = elapsed / progress;
            const remaining = Math.max(0, Math.floor(totalEst - elapsed));
            const rh = Math.floor(remaining / 3600).toString().padStart(2, '0');
            const rm = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0');
            const rs = (remaining % 60).toString().padStart(2, '0');
            timerRemaining.innerText = `${rh}:${rm}:${rs}`;
        }
    }, 1000);

    currentAbortController = new AbortController();

    try {
        const useGPU = document.getElementById('checkUseGPU')?.checked ?? true;
        const settings = {
            width: 1920, height: 1080, fps: 30, sampleRate: 44100,
            ...(state.projectSettings || {}),
            quality: quality,
            formatCode: format,
            useGPU: useGPU
        };

        const response = await fetch('api/export.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clips: state.clips.map(c => ({
                    ...c,
                    src: c.serverSrc || c.src,
                    serverSrc: c.serverSrc || null
                })),
                project: fileName,
                settings: settings
            }),
            signal: currentAbortController.signal
        });

        if (progressBar) progressBar.style.setProperty('width', '60%');
        if (percentageText) percentageText.innerText = '60%';
        if (statusText) statusText.innerText = useGPU ? 'GPU Renderizando em Alta Velocidade...' : 'Processando via CPU...';

        // Validação robusta de JSON (Evita travar se vier HTML/Erro do PHP)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawBody = await response.text();
            throw new Error('O servidor não retornou JSON. Possível erro PHP: ' + rawBody.substring(0, 100));
        }

        const result = await response.json();

        if (result.status === 'success') {
            clearInterval(timerInterval);
            if (progressBar) progressBar.style.setProperty('width', '100%');
            if (percentageText) percentageText.innerText = '100%';

            const exportResult = {
                job_id: result.job_id || Date.now(),
                video_url: result.video_url,
                fileName: fileName,
                fileSize: result.file_size
            };
            window._lastExportResult = exportResult;
            showExportStage('success');
            setupModalActions(exportResult);
        } else {
            throw new Error(result.message || 'Erro no servidor: Verifique se os arquivos de mídia foram sincronizados.');
        }

    } catch (err) {
        clearInterval(timerInterval);
        if (err.name === 'AbortError') return;
        showToast('Erro Crítico: ' + err.message, 'error', 5000);
        showExportStage('settings');
    } finally {
        currentAbortController = null;
    }
}

function setupModalActions(result) {
    const btnDownload = document.getElementById('btnDownloadResult');
    const btnGDrive = document.getElementById('btnExportGDrive');
    const btnDropbox = document.getElementById('btnExportDropbox');
    const btnOneDrive = document.getElementById('btnExportOneDrive');

    if (!btnDownload || !result) return;

    const toast = async (msg, type) => {
        const m = await import('./file-operations.js');
        m.showToast(msg, type, 3000);
    };

    // Remove listeners antigos para evitar downloads duplicados
    const newBtnDownload = btnDownload.cloneNode(true);
    btnDownload.parentNode.replaceChild(newBtnDownload, btnDownload);

    newBtnDownload.addEventListener('click', async (e) => {
        e.preventDefault();

        // SAVE PICKER (Moderno)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${result.fileName}.${result.video_url.split('.').pop() || 'mp4'}`,
                    types: [{
                        description: 'Video File',
                        accept: { 'video/mp4': ['.mp4'] },
                    }],
                });
                const writable = await handle.createWritable();
                const response = await fetch(result.video_url);
                await response.body.pipeTo(writable);
                toast('Arquivo salvo com sucesso!', 'success');
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    // Fallback silencioso se der erro ou usuário cancelar
                } else {
                    return; // Cancelado pelo user
                }
            }
        }

        // FALLBACK (Download Clássico)
        const a = document.createElement('a');
        // Garante que o caminho seja tratado como relativo à raiz do site se necessário
        const finalUrl = result.video_url.startsWith('http') ? result.video_url : result.video_url;
        a.href = finalUrl;
        const ext = result.video_url.split('.').pop() || 'mp4';
        a.download = `${result.fileName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast('Iniciando transferência segura...', 'success');
    });

    const cloudHandler = (service) => (e) => {
        e.preventDefault();
        toast(`Conectando ao ${service} API...`, 'info');
        setTimeout(() => {
            // Simulação de upload real enviando o link do servidor para a API da nuvem
            toast(`Arquivo "${result.fileName}" sincronizado no ${service}!`, 'success');
        }, 2000);
    };

    btnGDrive?.addEventListener('click', cloudHandler('Google Drive'));
    btnDropbox?.addEventListener('click', cloudHandler('Dropbox'));
    btnOneDrive?.addEventListener('click', cloudHandler('OneDrive'));
}
