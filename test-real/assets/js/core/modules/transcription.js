// transcription.js
// Ferramenta de Transcrição usando OpenAI Whisper API

import { state } from './state.js';
import { showToast } from './file-operations.js';

export class TranscriptionManager {
    static async showTranscriptionPanel() {
        // Remover painel anterior se existir
        document.querySelector('.transcription-panel')?.remove();

        const modal = document.createElement('div');
        modal.className = 'side-panel transcription-panel';

        // Recupera API Key salva
        const apiKey = localStorage.getItem('openai_api_key') || '';

        modal.innerHTML = `
            <div class="panel-header">
                <h4>🎙️ Transcrição (AI)</h4>
                <button class="btn-close" name="close_transcription">✕</button>
            </div>

            <div class="panel-content">
                <div class="alert-box mb-20">
                    <strong>Nota:</strong> Esta ferramenta usa a API OpenAI Whisper para precisão máxima. É necessário uma chave de API.
                </div>

                <div class="form-group">
                    <label for="apiKey">API Key (OpenAI):</label>
                    <input type="password" id="apiKey" name="openai_api_key" class="panel-input" value="${apiKey}" placeholder="sk-..." />
                </div>

                <div class="form-group">
                    <label for="transcribe-clip-select">Selecione o Clip:</label>
                    <select id="transcribe-clip-select" name="transcribe_clip" class="panel-select">
                        ${state.clips.filter(c => c.type === 'audio' || c.type === 'video').length === 0
                ? '<option value="">Nenhum clip disponível</option>'
                : state.clips.filter(c => c.type === 'audio' || c.type === 'video').map(c => `
                                <option value="${c.id}" ${c.id === state.selectedClipId ? 'selected' : ''}>${c.name}</option>
                            `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="language">Idioma:</label>
                    <select id="language" name="transcribe_language" class="panel-select">
                        <option value="pt">Português</option>
                        <option value="en">Inglês</option>
                        <option value="es">Espanhol</option>
                    </select>
                </div>

                <div class="transcription-loading text-center mt-16" style="display: none;">
                    <div class="spinner"></div>
                    <p class="mt-16 text-muted">Enviando e processando áudio...</p>
                    <small class="text-muted">Isso pode levar alguns instantes dependendo do tamanho.</small>
                </div>

                <button class="btn-primary btn-full" id="btn-start-transcribe">
                    Iniciar Transcrição
                </button>

                <div class="transcription-result mt-16" style="display: none;">
                    <label for="resultText">Resultado:</label>
                    <textarea id="resultText" name="transcription_result" class="panel-textarea mt-16"></textarea>
                    
                    <div class="result-actions mt-16 flex-between" style="gap: 10px;">
                        <button class="btn-secondary flex-1" id="btn-copy" name="copy_transcription">Copiar</button>
                        <button class="btn-primary flex-1" id="btn-create-captions" name="create_captions">Criar Legendas</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handlers
        modal.querySelector('.btn-close').addEventListener('click', () => modal.remove());

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

            // Salva a key para facilitar
            localStorage.setItem('openai_api_key', key);

            // Obtém o clip
            const clip = state.clips.find(c => c.id === clipId);
            if (!clip) return;

            // UI Loading
            btnStart.disabled = true;
            modal.querySelector('.transcription-loading').style.display = 'block';

            try {
                // 1. Fetch do Blob
                const response = await fetch(clip.src);
                const blob = await response.blob();

                // 2. Prepara FormData
                const formData = new FormData();
                formData.append('file', blob, 'audio.mp3'); // A API aceita vários formatos, .mp3/.wav genérico funciona
                formData.append('model', 'whisper-1');
                formData.append('language', lang);
                formData.append('response_format', 'verbose_json'); // Importante para timestamps!

                // 3. Envia para OpenAI
                const apiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`
                    },
                    body: formData
                });

                if (!apiRes.ok) {
                    const err = await apiRes.json();
                    throw new Error(err.error?.message || 'Erro na API');
                }

                const data = await apiRes.json();

                // 4. Mostra resultado
                modal.querySelector('.transcription-loading').style.display = 'none';
                modal.querySelector('.transcription-result').style.display = 'block';

                // Exibe texto completo
                const textArea = modal.querySelector('#resultText');
                textArea.value = data.text;

                // Salva segmentos brutos para criação de legendas
                modal.dataset.segments = JSON.stringify(data.segments || []);

                showToast('Transcrição concluída com sucesso!', 'success');

            } catch (error) {
                showToast(`Erro: ${error.message}`, 'error', 4000);
                modal.querySelector('.transcription-loading').style.display = 'none';
                btnStart.disabled = false;
            }
        });

        // Criar Legendas (Overlay)
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
                        // Cria um texto para cada segmento
                        // Ajusta o tempo: clip.start + tempo_do_segmento
                        // Nota: text-layer.js atual cria no meio da tela.
                        // Idealmente passariamos o tempo exato para timeline.
                        // Como nosso sistema de overlay atual é simples (visual), vamos apenas criar os elementos
                        // Para uma legenda real sincronizada, precisaríamos de uma track de "Legendas".

                        // Por enquanto, vamos criar apenas os textos no "banco" de overlays com timestamp
                        // O text-layer.js precisa suportar start/duration.
                        // Vamos adaptar chamando direto a criação no state se necessario ou usando a func publica

                        // Workaround: Criar overlays "visuais"
                        // Usuário terá que ajustar posição.
                        // Se tiver muitos segmentos, cria apenas os primeiros 5 para não poluir
                        if (count < 20) {
                            mod.addTextOverlay(overlayLayer, seg.text.trim());
                            // TODO: Atualizar o overlay recém criado com start/duration correto
                            const lastOverlay = state.overlays[state.overlays.length - 1];
                            if (lastOverlay) {
                                lastOverlay.start = clipStart + seg.start;
                                lastOverlay.duration = seg.end - seg.start;
                            }
                            count++;
                        }
                    });

                    showToast(`${count} legendas criadas (limitado a 20 para performance). Ajuste na timeline.`, 'success', 3000);
                    // Força render timeline para mostrar os "clips" de texto se a timeline suportar
                    // Atualmente overlays são globais? state.overlays
                    // Precisamos garantir que o renderizador mostre.

                    modal.remove();
                });

            } catch (e) {
                showToast('Erro ao processar legendas', 'error');
            }
        });
    }
}
