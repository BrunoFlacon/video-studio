// sequence-settings.js
// Modal de Nova Sequência (Fidelidade Adobe Premiere)

import { state, notifyChange } from './state.js';
import { showToast } from './file-operations.js';

/**
 * Exibe o modal profissional de Nova Sequência inspirado no Adobe Premiere.
 */
export function showSequenceSettings() {
    const settings = state.projectSettings || {
        width: 1920,
        height: 1080,
        fps: 30,
        sampleRate: 44100,
        colorSpace: 'Rec. 709',
        previewFormat: 'QuickTime',
        previewCodec: 'Apple ProRes 422 LT'
    };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content sequence-modal premiere-style">
            <div class="modal-header">
                <h3>Nova Sequência</h3>
                <button class="btn-close-modal" aria-label="Fechar">&times;</button>
            </div>
            
            <div class="modal-tabs">
                <button class="tab-btn active" data-tab="geral">Geral</button>
                <button class="tab-btn" data-tab="vr">Propriedades de VR</button>
            </div>

            <div class="modal-body">
                <div class="tab-content active" id="tab-geral">
                    
                    <!-- EDIÇÃO -->
                    <div class="form-section">
                        <div class="form-row">
                            <label for="seqEditMode">Modo de edição:</label>
                            <select id="seqEditMode" name="seq_edit_mode" class="ui-select">
                                <option value="custom" selected>Personalizado</option>
                                <option value="dlsr">DSLR</option>
                                <option value="prores">Apple ProRes</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label for="seqFps">Base de tempo:</label>
                            <select id="seqFps" name="seq_fps" class="ui-select">
                                <option value="23.976" ${settings.fps == 23.976 ? 'selected' : ''}>23,976 quadros/s</option>
                                <option value="24" ${settings.fps == 24 ? 'selected' : ''}>24,00 quadros/s</option>
                                <option value="25" ${settings.fps == 25 ? 'selected' : ''}>25,00 quadros/s</option>
                                <option value="29.97" ${settings.fps == 29.97 ? 'selected' : ''}>29,97 quadros/s</option>
                                <option value="30" ${settings.fps == 30 ? 'selected' : ''}>30,00 quadros/s</option>
                                <option value="50" ${settings.fps == 50 ? 'selected' : ''}>50,00 quadros/s</option>
                                <option value="59.94" ${settings.fps == 59.94 ? 'selected' : ''}>59,94 quadros/s</option>
                                <option value="60" ${settings.fps == 60 ? 'selected' : ''}>60,00 quadros/s</option>
                                <option value="120" ${settings.fps == 120 ? 'selected' : ''}>120,00 quadros/s</option>
                            </select>
                        </div>
                    </div>

                    <!-- VÍDEO -->
                    <fieldset class="premiere-fieldset">
                        <legend>Vídeo</legend>
                        <div class="form-row">
                            <label>Tamanho do quadro:</label>
                            <div class="input-group-premiere">
                                <input type="number" id="seqWidth" name="seq_width" value="${settings.width}" class="ui-input small">
                                <span class="label-inline">horizontal</span>
                                <input type="number" id="seqHeight" name="seq_height" value="${settings.height}" class="ui-input small">
                                <span class="label-inline">vertical</span>
                                <span class="aspect-ratio-tag">16:9</span>
                            </div>
                        </div>
                        <div class="form-row">
                             <label class="checkbox-label">
                                <input type="checkbox" id="checkProportional" name="proportional_motion" checked> 
                                Dimensionar efeitos de movimento proporcionalmente ao alterar o tamanho de quadros
                             </label>
                        </div>
                        <div class="form-row">
                            <label for="seqPixelType">Taxa de proporção de pixel:</label>
                            <select id="seqPixelType" name="seq_pixel_type" class="ui-select">
                                <option value="1.0" selected>Pixels quadrados (1,0)</option>
                                <option value="0.9091">D1/DV NTSC (0,9091)</option>
                                <option value="1.0909">D1/DV PAL (1,0909)</option>
                                <option value="1.3333">HD Anamórfico 1080 (1,3333)</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label for="seqFields">Campos:</label>
                            <select id="seqFields" name="seq_fields" class="ui-select">
                                <option value="none" selected>Sem campos (varredura progressiva)</option>
                                <option value="upper">Campo superior primeiro</option>
                                <option value="lower">Campo inferior primeiro</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label for="seqDisplayFormat">Formato de exibição:</label>
                            <select id="seqDisplayFormat" name="seq_display_format" class="ui-select">
                                <option value="timecode" selected>Timecode de ${Math.round(settings.fps)} qps</option>
                                <option value="frames">Quadros</option>
                            </select>
                        </div>
                    </fieldset>

                    <!-- COR -->
                    <fieldset class="premiere-fieldset">
                        <legend>Cor</legend>
                        <div class="form-row">
                            <label for="seqColorSpace">Espaço da cor de trabalho:</label>
                            <select id="seqColorSpace" name="seq_color_space" class="ui-select">
                                <option value="Rec. 709" ${settings.colorSpace === 'Rec. 709' ? 'selected' : ''}>Rec. 709</option>
                                <option value="Rec. 2100 HLG">Rec. 2100 HLG</option>
                                <option value="Rec. 2100 PQ">Rec. 2100 PQ</option>
                            </select>
                        </div>
                        <div class="form-row">
                             <label class="checkbox-label">
                                <input type="checkbox" id="checkToneMap" name="tone_mapping" checked> 
                                Mapeamento de tons de mídia automático
                             </label>
                        </div>
                    </fieldset>

                    <!-- ÁUDIO -->
                    <fieldset class="premiere-fieldset">
                        <legend>Áudio</legend>
                        <div class="form-row">
                            <label for="seqSampleRate">Taxa de amostragem:</label>
                            <select id="seqSampleRate" name="seq_sample_rate" class="ui-select">
                                <option value="32000" ${settings.sampleRate == 32000 ? 'selected' : ''}>32000 Hz</option>
                                <option value="44100" ${settings.sampleRate == 44100 ? 'selected' : ''}>44100 Hz</option>
                                <option value="48000" ${settings.sampleRate == 48000 ? 'selected' : ''}>48000 Hz</option>
                                <option value="96000" ${settings.sampleRate == 96000 ? 'selected' : ''}>96000 Hz</option>
                                <option value="ffmpeg">FFmpeg (AAC/MP3)</option>
                            </select>
                        </div>
                         <div class="form-row">
                            <label for="seqAudioDisplay">Formato de exibição:</label>
                            <select id="seqAudioDisplay" name="seq_audio_display" class="ui-select">
                                <option value="samples" selected>Amostras de áudio</option>
                                <option value="milliseconds">Milissegundos</option>
                            </select>
                        </div>
                    </fieldset>

                    <!-- VISUALIZAÇÕES -->
                    <fieldset class="premiere-fieldset">
                        <legend>Visualizações de vídeo</legend>
                        <div class="form-row">
                            <label for="seqPreviewFormat">Visualizar formato de arquivo:</label>
                            <select id="seqPreviewFormat" name="seq_preview_format" class="ui-select">
                                <option value="QuickTime" selected>QuickTime</option>
                                <option value="I-Frame Only MPEG">I-Frame Only MPEG</option>
                                <option value="FFmpeg">FFmpeg (MP4/MKV)</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label for="seqPreviewCodec">Codec:</label>
                            <select id="seqPreviewCodec" name="seq_preview_codec" class="ui-select">
                                <option value="Apple ProRes 422 LT" selected>Apple ProRes 422 LT</option>
                                <option value="Apple ProRes 422 HQ">Apple ProRes 422 HQ</option>
                                <option value="GoPro CineForm">GoPro CineForm (YUV 10-bit)</option>
                                <option value="FFmpeg H.264">FFmpeg (H.264/AVC)</option>
                                <option value="FFmpeg HEVC">FFmpeg (H.265/HEVC)</option>
                            </select>
                        </div>
                         <div class="form-row">
                            <label>Tamanho:</label>
                            <div class="preview-resolution-info">
                                <span id="prevResText">${settings.width} x ${settings.height}</span>
                            </div>
                        </div>
                        <div class="form-row">
                             <label class="checkbox-label">
                                <input type="checkbox" id="checkBitDepth" name="max_bit_depth"> Profundidade de bits máxima
                             </label>
                        </div>
                        <div class="form-row">
                             <label class="checkbox-label">
                                <input type="checkbox" id="checkMaxQuality" name="max_render_quality"> Qualidade máxima de renderização
                             </label>
                        </div>
                    </fieldset>
                </div>

                <div class="tab-content" id="tab-vr">
                    <div class="form-section">
                        <div class="form-row">
                            <label for="vrProjection">Projeção VR:</label>
                            <select id="vrProjection" name="vr_projection" class="ui-select">
                                <option value="none" ${!settings.vr || settings.vr.projection === 'none' ? 'selected' : ''}>Nenhuma (Vídeo 2D)</option>
                                <option value="monoscopic" ${settings.vr?.projection === 'monoscopic' ? 'selected' : ''}>Monoscópica</option>
                                <option value="stereoscopic-sbs" ${settings.vr?.projection === 'stereoscopic-sbs' ? 'selected' : ''}>Estereoscópica (Lado a Lado)</option>
                                <option value="stereoscopic-tb" ${settings.vr?.projection === 'stereoscopic-tb' ? 'selected' : ''}>Estereoscópica (Superior/Inferior)</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label for="vrHorizontalFOV">Campo de Visão Horizontal:</label>
                            <div class="input-group-premiere">
                                <input type="number" id="vrHorizontalFOV" name="vr_h_fov" value="${settings.vr?.hFOV || 360}" class="ui-input small">
                                <span class="label-inline">graus</span>
                            </div>
                        </div>
                        <div class="form-row">
                            <label for="vrVerticalFOV">Campo de Visão Vertical:</label>
                            <div class="input-group-premiere">
                                <input type="number" id="vrVerticalFOV" name="vr_v_fov" value="${settings.vr?.vFOV || 180}" class="ui-input small">
                                <span class="label-inline">graus</span>
                            </div>
                        </div>
                    </div>
                    <p class="vr-info" style="margin-top: 15px; font-size: 0.8rem; color: var(--text-muted);">
                        Nota: As configurações de VR aplicam metadados específicos ao arquivo de saída para compatibilidade com players 360/VR.
                    </p>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn-secondary modal-cancel">Cancelar</button>
                <button class="btn-primary modal-save">OK</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // EVENTOS DE TABS
    const tabs = modal.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            modal.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // EVENTOS DE FECHAMENTO
    const closeModal = () => modal.remove();
    modal.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    modal.querySelector('.modal-cancel').addEventListener('click', closeModal);

    // EVENTO DE SALVAR
    modal.querySelector('.modal-save').addEventListener('click', () => {
        const width = parseInt(modal.querySelector('#seqWidth').value) || 1920;
        const height = parseInt(modal.querySelector('#seqHeight').value) || 1080;
        const fps = parseFloat(modal.querySelector('#seqFps').value) || 30;
        const sampleRate = parseInt(modal.querySelector('#seqSampleRate').value) || 44100;

        state.projectSettings = {
            width,
            height,
            fps,
            sampleRate,
            colorSpace: modal.querySelector('#seqColorSpace').value,
            previewFormat: modal.querySelector('#seqPreviewFormat').value,
            previewCodec: modal.querySelector('#seqPreviewCodec').value,
            vr: {
                projection: modal.querySelector('#vrProjection').value,
                hFOV: parseInt(modal.querySelector('#vrHorizontalFOV').value) || 360,
                vFOV: parseInt(modal.querySelector('#vrVerticalFOV').value) || 180
            }
        };

        showToast('Sequência criada com sucesso', 'success', 2500);
        notifyChange();
        closeModal();

        // Se a timeline estiver vazia, podemos recarregá-la suavemente
        const timeline = document.getElementById('timeline');
        if (timeline) {
            import('./timeline.js').then(m => m.renderTimeline(timeline, state.pxPerSecond || 100));
        }
    });

    // DINÂMICA DE ASPECT RATIO
    const wInput = modal.querySelector('#seqWidth');
    const hInput = modal.querySelector('#seqHeight');
    const ratioTag = modal.querySelector('.aspect-ratio-tag');
    const prevResText = modal.querySelector('#prevResText');

    function updateRatio() {
        const w = parseInt(wInput.value) || 1;
        const h = parseInt(hInput.value) || 1;
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const r = gcd(w, h);
        ratioTag.textContent = `${w / r}:${h / r}`;
        if (prevResText) prevResText.textContent = `${w} x ${h}`;
    }

    wInput.addEventListener('input', updateRatio);
    hInput.addEventListener('input', updateRatio);

    // Atualiza inicialmente
    updateRatio();
}
