// sequence-settings-mod.js
// Modal de Nova Sequência (Fidelidade Adobe Premiere)
// CSP-Safe: Construção 100% via DOM API (zero innerHTML)

import { state, notifyChange, updateProjectSettings } from './state.js';
import { showToast } from './file-operations.js';
import { el } from './dom-utils.js';

// ─── Helpers específicos para este modal ───

function createFormRow(labelTxt, inputId, inputEl) {
    return el('div', { className: 'form-row' }, [
        el('label', { htmlFor: inputId, textContent: labelTxt }),
        inputEl
    ]);
}

function createOption(value, text, selected) {
    return el('option', { value, textContent: text, ...(selected ? { selected: 'selected' } : {}) });
}

function createSelect(id, options, selectedValue) {
    const select = el('select', { id, className: 'ui-select' });
    options.forEach(opt => {
        select.appendChild(createOption(opt.v, opt.t, String(opt.v) === String(selectedValue)));
    });
    return select;
}

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

    const modal = el('div', { className: 'modal-overlay' });
    const content = el('div', { className: 'modal-content sequence-modal premiere-style' });

    // HEADER
    const header = el('div', { className: 'modal-header' }, [
        el('h3', { textContent: 'Nova Sequência' }),
        el('button', { className: 'btn-close-modal', title: 'Fechar', onClick: () => modal.remove() }, '×')
    ]);
    content.appendChild(header);

    // TABS
    const tabBtnGeral = el('button', { className: 'tab-btn active', textContent: 'Geral', 'data-tab': 'geral' });
    const tabBtnVR = el('button', { className: 'tab-btn', textContent: 'Propriedades de VR', 'data-tab': 'vr' });
    const tabs = el('div', { className: 'modal-tabs' }, [tabBtnGeral, tabBtnVR]);
    content.appendChild(tabs);

    const body = el('div', { className: 'modal-body' });

    // --- TAB GERAL ---
    const tabGeral = el('div', { className: 'tab-content active', id: 'tab-geral' });

    // EDIÇÃO
    const editSection = el('div', { className: 'form-section' }, [
        createFormRow('Modo de edição:', 'seqEditMode', createSelect('seqEditMode', [
            { v: 'custom', t: 'Personalizado' },
            { v: 'dlsr', t: 'DSLR' },
            { v: 'prores', t: 'Apple ProRes' }
        ], 'custom')),
        createFormRow('Base de tempo:', 'seqFps', createSelect('seqFps', [
            { v: '23.976', t: '23,976 quadros/s' },
            { v: '24', t: '24,00 quadros/s' },
            { v: '25', t: '25,00 quadros/s' },
            { v: '29.97', t: '29,97 quadros/s' },
            { v: '30', t: '30,00 quadros/s' },
            { v: '50', t: '50,00 quadros/s' },
            { v: '59.94', t: '59,94 quadros/s' },
            { v: '60', t: '60,00 quadros/s' },
            { v: '120', t: '120,00 quadros/s' }
        ], settings.fps))
    ]);
    tabGeral.appendChild(editSection);

    // VÍDEO
    const videoFs = el('fieldset', { className: 'premiere-fieldset' }, [
        el('legend', { textContent: 'Vídeo' }),
        el('div', { className: 'form-row' }, [
            el('label', { textContent: 'Tamanho do quadro:' }),
            el('div', { className: 'input-group-premiere' }, [
                el('input', { type: 'number', id: 'seqWidth', value: settings.width, className: 'ui-input small' }),
                el('span', { className: 'label-inline', textContent: 'horizontal' }),
                el('input', { type: 'number', id: 'seqHeight', value: settings.height, className: 'ui-input small' }),
                el('span', { className: 'label-inline', textContent: 'vertical' }),
                el('span', { className: 'aspect-ratio-tag', textContent: '16:9' })
            ])
        ]),
        el('div', { className: 'form-row' }, [
            el('label', { className: 'checkbox-label' }, [
                el('input', { type: 'checkbox', id: 'checkProportional', checked: 'checked' }),
                el('span', { textContent: ' Dimensionar efeitos de movimento proporcionalmente ao alterar o tamanho de quadros' })
            ])
        ]),
        createFormRow('Taxa de proporção de pixel:', 'seqPixelType', createSelect('seqPixelType', [
            { v: '1.0', t: 'Pixels quadrados (1,0)' },
            { v: '0.9091', t: 'D1/DV NTSC (0,9091)' },
            { v: '1.0909', t: 'D1/DV PAL (1,0909)' },
            { v: '1.3333', t: 'HD Anamórfico 1080 (1,3333)' }
        ], '1.0')),
        createFormRow('Campos:', 'seqFields', createSelect('seqFields', [
            { v: 'none', t: 'Sem campos (varredura progressiva)' },
            { v: 'upper', t: 'Campo superior primeiro' },
            { v: 'lower', t: 'Campo inferior primeiro' }
        ], 'none')),
        createFormRow('Formato de exibição:', 'seqDisplayFormat', createSelect('seqDisplayFormat', [
            { v: 'timecode', t: `Timecode de ${Math.round(settings.fps)} qps` },
            { v: 'frames', t: 'Quadros' }
        ], 'timecode'))
    ]);
    tabGeral.appendChild(videoFs);

    // COR
    const corFs = el('fieldset', { className: 'premiere-fieldset' }, [
        el('legend', { textContent: 'Cor' }),
        createFormRow('Espaço da cor de trabalho:', 'seqColorSpace', createSelect('seqColorSpace', [
            { v: 'Rec. 709', t: 'Rec. 709' },
            { v: 'Rec. 2100 HLG', t: 'Rec. 2100 HLG' },
            { v: 'Rec. 2100 PQ', t: 'Rec. 2100 PQ' }
        ], settings.colorSpace)),
        el('div', { className: 'form-row' }, [
            el('label', { className: 'checkbox-label' }, [
                el('input', { type: 'checkbox', id: 'checkToneMap', checked: 'checked' }),
                el('span', { textContent: ' Mapeamento de tons de mídia automático' })
            ])
        ])
    ]);
    tabGeral.appendChild(corFs);

    // ÁUDIO
    const audioFs = el('fieldset', { className: 'premiere-fieldset' }, [
        el('legend', { textContent: 'Áudio' }),
        createFormRow('Taxa de amostragem:', 'seqSampleRate', createSelect('seqSampleRate', [
            { v: '32000', t: '32000 Hz' },
            { v: '44100', t: '44100 Hz' },
            { v: '48000', t: '48000 Hz' },
            { v: '96000', t: '96000 Hz' },
            { v: 'ffmpeg', t: 'FFmpeg (AAC/MP3)' }
        ], settings.sampleRate)),
        createFormRow('Formato de exibição:', 'seqAudioDisplay', createSelect('seqAudioDisplay', [
            { v: 'samples', t: 'Amostras de áudio' },
            { v: 'milliseconds', t: 'Milissegundos' }
        ], 'samples'))
    ]);
    tabGeral.appendChild(audioFs);

    // VISUALIZAÇÕES
    const prevFs = el('fieldset', { className: 'premiere-fieldset' }, [
        el('legend', { textContent: 'Visualizações de vídeo' }),
        createFormRow('Visualizar formato de arquivo:', 'seqPreviewFormat', createSelect('seqPreviewFormat', [
            { v: 'QuickTime', t: 'QuickTime' },
            { v: 'I-Frame Only MPEG', t: 'I-Frame Only MPEG' },
            { v: 'FFmpeg', t: 'FFmpeg (MP4/MKV)' }
        ], settings.previewFormat)),
        createFormRow('Codec:', 'seqPreviewCodec', createSelect('seqPreviewCodec', [
            { v: 'Apple ProRes 422 LT', t: 'Apple ProRes 422 LT' },
            { v: 'Apple ProRes 422 HQ', t: 'Apple ProRes 422 HQ' },
            { v: 'GoPro CineForm', t: 'GoPro CineForm (YUV 10-bit)' },
            { v: 'FFmpeg H.264', t: 'FFmpeg (H.264/AVC)' },
            { v: 'FFmpeg HEVC', t: 'FFmpeg (H.265/HEVC)' }
        ], settings.previewCodec)),
        el('div', { className: 'form-row' }, [
            el('label', { textContent: 'Tamanho:' }),
            el('div', { className: 'preview-resolution-info' }, [
                el('span', { id: 'prevResText', textContent: `${settings.width} x ${settings.height}` })
            ])
        ]),
        el('div', { className: 'form-row' }, [
            el('label', { className: 'checkbox-label' }, [
                el('input', { type: 'checkbox', id: 'checkBitDepth' }),
                el('span', { textContent: ' Profundidade de bits máxima' })
            ])
        ]),
        el('div', { className: 'form-row' }, [
            el('label', { className: 'checkbox-label' }, [
                el('input', { type: 'checkbox', id: 'checkMaxQuality' }),
                el('span', { textContent: ' Qualidade máxima de renderização' })
            ])
        ])
    ]);
    tabGeral.appendChild(prevFs);

    body.appendChild(tabGeral);

    // --- TAB VR ---
    const tabVR = el('div', { className: 'tab-content', id: 'tab-vr' }, [
        el('div', { className: 'form-section' }, [
            createFormRow('Projeção VR:', 'vrProjection', createSelect('vrProjection', [
                { v: 'none', t: 'Nenhuma (Vídeo 2D)' },
                { v: 'monoscopic', t: 'Monoscópica' },
                { v: 'stereoscopic-sbs', t: 'Estereoscópica (Lado a Lado)' },
                { v: 'stereoscopic-tb', t: 'Estereoscópica (Superior/Inferior)' }
            ], settings.vr?.projection || 'none')),
            createFormRow('Campo de Visão Horizontal:', 'vrHorizontalFOV', el('div', { className: 'input-group-premiere' }, [
                el('input', { type: 'number', id: 'vrHorizontalFOV', value: settings.vr?.hFOV || 360, className: 'ui-input small' }),
                el('span', { className: 'label-inline', textContent: 'graus' })
            ])),
            createFormRow('Campo de Visão Vertical:', 'vrVerticalFOV', el('div', { className: 'input-group-premiere' }, [
                el('input', { type: 'number', id: 'vrVerticalFOV', value: settings.vr?.vFOV || 180, className: 'ui-input small' }),
                el('span', { className: 'label-inline', textContent: 'graus' })
            ]))
        ]),
        el('p', { className: 'vr-info', style: 'margin-top: 15px; font-size: 0.8rem; color: var(--text-muted);', textContent: 'Nota: As configurações de VR aplicam metadados específicos ao arquivo de saída para compatibilidade com players 360/VR.' })
    ]);
    body.appendChild(tabVR);

    content.appendChild(body);

    // FOOTER
    const btnCancel = el('button', { className: 'btn-secondary modal-cancel', textContent: 'Cancelar', onClick: () => modal.remove() });
    const btnSave = el('button', { className: 'btn-primary modal-save', textContent: 'OK' });
    const footer = el('div', { className: 'modal-footer' }, [btnCancel, btnSave]);
    content.appendChild(footer);

    modal.appendChild(content);
    document.body.appendChild(modal);

    // EVENTOS DE TABS
    const tabBtns = [tabBtnGeral, tabBtnVR];
    const tabContents = [tabGeral, tabVR];
    tabBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            tabContents[idx].classList.add('active');
        });
    });

    // EVENTO DE SALVAR
    btnSave.addEventListener('click', () => {
        const width = parseInt(modal.querySelector('#seqWidth').value) || 1920;
        const height = parseInt(modal.querySelector('#seqHeight').value) || 1080;
        const fps = parseFloat(modal.querySelector('#seqFps').value) || 30;
        const sampleRate = modal.querySelector('#seqSampleRate').value;

        updateProjectSettings({
            width,
            height,
            fps,
            sampleRate: isNaN(parseInt(sampleRate)) ? sampleRate : parseInt(sampleRate),
            colorSpace: modal.querySelector('#seqColorSpace').value,
            previewFormat: modal.querySelector('#seqPreviewFormat').value,
            previewCodec: modal.querySelector('#seqPreviewCodec').value,
            vr: {
                projection: modal.querySelector('#vrProjection').value,
                hFOV: parseInt(modal.querySelector('#vrHorizontalFOV').value) || 360,
                vFOV: parseInt(modal.querySelector('#vrVerticalFOV').value) || 180
            }
        });

        showToast('Sequência atualizada com sucesso', 'success', 2500);
        modal.remove();

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
        if (ratioTag) ratioTag.textContent = `${w / r}:${h / r}`;
        if (prevResText) prevResText.textContent = `${w} x ${h}`;
    }

    wInput.addEventListener('input', updateRatio);
    hInput.addEventListener('input', updateRatio);
    updateRatio();
}
