// transcription.js
// Ferramenta de Transcrição usando OpenAI Whisper API
// CSP-Safe: Construção via DOM API (zero innerHTML)

import { state } from './state.js';
import { showToast } from './file-operations.js';
import { el, createSVG } from './dom-utils.js';

export class TranscriptionManager {
    static async showTranscriptionPanel() {
        document.querySelector('.transcription-panel')?.remove();

        const modal = el('div', { className: 'side-panel transcription-panel' });
        const apiKey = localStorage.getItem('openai_api_key') || '';

        // HEADER
        const header = el('div', { className: 'panel-header' }, [
            el('h4', { textContent: '🎙️ Transcrição (AI)' }),
            el('button', { className: 'btn-close', onClick: () => modal.remove() }, '✕')
        ]);
        modal.appendChild(header);

        // CONTENT
        const content = el('div', { className: 'panel-content' }, [
            el('div', { className: 'alert-box mb-20' }, [
                el('strong', { textContent: 'Nota:' }),
                el('span', { textContent: ' Esta ferramenta usa a API OpenAI Whisper para precisão máxima. É necessário uma chave de API.' })
            ]),

            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'apiKey', textContent: 'API Key (OpenAI):' }),
                el('input', { type: 'password', id: 'apiKey', className: 'panel-input', value: apiKey, placeholder: 'sk-...' })
            ]),

            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'transcribe-clip-select', textContent: 'Selecione o Clip:' }),
                el('select', { id: 'transcribe-clip-select', className: 'panel-select' },
                    state.clips.filter(c => c.type === 'audio' || c.type === 'video').length === 0
                        ? [el('option', { value: '', textContent: 'Nenhum clip disponível' })]
                        : state.clips.filter(c => c.type === 'audio' || c.type === 'video').map(c =>
                            el('option', { value: c.id, textContent: c.name, ...(c.id === state.selectedClipId ? { selected: 'selected' } : {}) })
                        )
                )
            ]),

            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'language', textContent: 'Idioma:' }),
                el('select', { id: 'language', className: 'panel-select' }, [
                    el('option', { value: 'pt', textContent: 'Português' }),
                    el('option', { value: 'en', textContent: 'Inglês' }),
                    el('option', { value: 'es', textContent: 'Espanhol' })
                ])
            ]),

            el('div', { className: 'transcription-loading text-center mt-16', style: { display: 'none' } }, [
                el('div', { className: 'spinner' }),
                el('p', { className: 'mt-16 text-muted', textContent: 'Enviando e processando áudio...' }),
                el('small', { className: 'text-muted', textContent: 'Isso pode levar alguns instantes dependendo do tamanho.' })
            ]),

            el('button', { className: 'btn-primary btn-full', id: 'btn-start-transcribe', textContent: 'Iniciar Transcrição' }),

            el('div', { className: 'transcription-result mt-16', style: { display: 'none' } }, [
                el('label', { htmlFor: 'resultText', textContent: 'Resultado:' }),
                el('textarea', { id: 'resultText', className: 'panel-textarea mt-16' }),
                el('div', { className: 'result-actions mt-16 flex-between', style: { gap: '10px' } }, [
                    el('button', { className: 'btn-secondary flex-1', id: 'btn-copy', textContent: 'Copiar' }),
                    el('button', { className: 'btn-primary flex-1', id: 'btn-create-captions', textContent: 'Criar Legendas' })
                ])
            ])
        ]);
        modal.appendChild(content);

        document.body.appendChild(modal);

        // Handlers
        const btnStart = modal.querySelector('#btn-start-transcribe');
        btnStart.addEventListener('click', async () => {
            const key = modal.querySelector('#apiKey').value.trim();
            const clipId = modal.querySelector('#transcribe-clip-select').value;
            const lang = modal.querySelector('#language').value;

            if (!key) {
                showToast('Por favor insira sua API Key da OpenAI', 'warning');
                return;
            }
            if (!clipId) {
                showToast('Selecione um clip para transcrever', 'warning');
                return;
            }

            localStorage.setItem('openai_api_key', key);
            const clip = state.clips.find(c => c.id === clipId);
            if (!clip) return;

            btnStart.disabled = true;
            modal.querySelector('.transcription-loading').style.display = 'block';

            try {
                const response = await fetch(clip.src);
                const blob = await response.blob();

                const formData = new FormData();
                formData.append('file', blob, 'audio.mp3');
                formData.append('model', 'whisper-1');
                formData.append('language', lang);
                formData.append('response_format', 'verbose_json');

                const apiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}` },
                    body: formData
                });

                if (!apiRes.ok) {
                    const err = await apiRes.json();
                    throw new Error(err.error?.message || 'Erro na API');
                }

                const data = await apiRes.json();
                modal.querySelector('.transcription-loading').style.display = 'none';
                modal.querySelector('.transcription-result').style.display = 'block';
                modal.querySelector('#resultText').value = data.text;
                modal.dataset.segments = JSON.stringify(data.segments || []);

                showToast('Transcrição concluída com sucesso!', 'success');
            } catch (error) {
                showToast(`Erro: ${error.message}`, 'error', 4000);
                modal.querySelector('.transcription-loading').style.display = 'none';
                btnStart.disabled = false;
            }
        });

        modal.querySelector('#btn-copy').addEventListener('click', () => {
            const text = modal.querySelector('#resultText').value;
            navigator.clipboard.writeText(text).then(() => showToast('Copiado para a área de transferência', 'success'));
        });

        modal.querySelector('#btn-create-captions').addEventListener('click', () => {
            const segmentsStr = modal.dataset.segments;
            if (!segmentsStr) {
                showToast('Nenhum dado de tempo encontrado.', 'warning');
                return;
            }

            try {
                const segments = JSON.parse(segmentsStr);
                const overlayLayer = document.getElementById('overlayLayer');
                const clipId = modal.querySelector('#transcribe-clip-select').value;
                const clip = state.clips.find(c => c.id === clipId);
                const clipStart = clip ? clip.start : 0;

                import('./text-layer.js').then(mod => {
                    let count = 0;
                    segments.forEach(seg => {
                        if (count < 20) {
                            mod.addTextOverlay(overlayLayer, seg.text.trim());
                            const lastOverlay = state.overlays[state.overlays.length - 1];
                            if (lastOverlay) {
                                lastOverlay.start = clipStart + seg.start;
                                lastOverlay.duration = seg.end - seg.start;
                            }
                            count++;
                        }
                    });
                    showToast(`${count} legendas criadas. Ajuste na timeline.`, 'success', 3000);
                    modal.remove();
                });
            } catch (e) {
                showToast('Erro ao processar legendas', 'error');
            }
        });
    }
}
