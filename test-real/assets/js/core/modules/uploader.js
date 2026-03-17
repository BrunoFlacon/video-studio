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
        const response = await fetch('api/upload.php', {
            method: 'POST',
            body: formData
        });

        const rawText = await response.text();

        // Tenta fazer parse do JSON
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error('Resposta não-JSON do servidor:', rawText);
            // Se for erro PHP HTML, tenta limpar tags
            const cleanText = rawText.replace(/<[^>]*>/g, '').trim().substring(0, 150);
            throw new Error(`Falha no servidor: ${cleanText || 'Resposta inválida'}`);
        }

        if (!response.ok || result.status !== 'success') {
            throw new Error(result.error || `Erro HTTP ${response.status}`);
        }

        return {
            filename: result.filename,
            path: result.path
        };

    } catch (err) {
        console.error('Erro no upload:', err);
        showToast(err.message, 'error');
        return null;
    }
}
