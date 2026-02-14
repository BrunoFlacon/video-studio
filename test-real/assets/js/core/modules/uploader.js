/**
 * Módulo de Upload de Mídia
 * Responsável por enviar arquivos locais para o servidor para processamento via FFmpeg.
 */

import { showToast } from './file-operations.js';

/**
 * Realiza o upload de um arquivo para o servidor.
 * @param {File} file - Objeto File do navegador.
 * @returns {Promise<string|null>} - Retorna o caminho do arquivo no servidor ou null em caso de erro.
 */
export async function uploadMedia(file) {
    if (!file) return null;

    const formData = new FormData();
    formData.append('media', file);

    try {
        const response = await fetch('/Live-Cut-Editor/test-real/assets/api/upload.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.status === 'success') {
            return {
                filename: result.filename,
                path: result.path
            };
        } else {
            showToast(`Erro no upload: ${result.error}`, 'error');
            return null;
        }
    } catch (err) {
        showToast('Falha crítica ao enviar arquivo ao servidor.', 'error');
        return null;
    }
}
