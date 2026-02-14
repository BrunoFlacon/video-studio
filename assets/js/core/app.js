import { Timeline } from './timeline.js?v=2';

function createText(text, lower = false) {
  const el = document.createElement('div');
  el.className = 'text-layer' + (lower ? ' lower-third' : '');
  el.contentEditable = true;
  el.innerText = text;

  let offsetX, offsetY, dragging = false;

  el.onmousedown = e => {
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  };

  document.onmousemove = e => {
    if (!dragging) return;
    el.style.left = (e.pageX - offsetX) + 'px';
    el.style.top = (e.pageY - offsetY) + 'px';
  };

  document.onmouseup = () => dragging = false;

  document.body.appendChild(el);
}

export const App = {
  // Inicialização do Aplicativo
  init() {
    Timeline.init();
    this.bindUpload();
    this.bindToolbar();
  },

  // Vincula o upload de vídeo ao elemento oculto
  bindUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'video-upload-input';
    input.name = 'video_upload';
    input.accept = 'video/*,audio/*';
    input.hidden = true;

    // Quando o arquivo é selecionado
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const url = URL.createObjectURL(file);

      // Verifica se é vídeo ou áudio e adiciona na track correta
      if (file.type.startsWith('video')) {
        document.getElementById('videoPreview').src = url;
        // Adiciona clip de vídeo na timeline (duração padrão 15s para teste)
        Timeline.addClip(Timeline.videoTrack, 15);
        // Inicia sincronização do playhead
        Timeline.startPlayback(document.getElementById('videoPreview'));
      } else {
        Timeline.addClip(Timeline.audioTrack, 15);
      }
    };

    document.body.appendChild(input);
    // Clique na área de preview abre o seletor de arquivo
    document.getElementById('preview').onclick = () => input.click();
  },

  // Vincula os botões da Toolbar (Topo) às funções
  bindToolbar() {
    // Botão CORTAR (Split)
    document.getElementById('btn-cut').onclick = () => {
      Timeline.splitAtPlayhead();
    };

    // Helper: Modal Customizado (Substitui prompt/alert para evitar bloqueio da thread)
    const showCustomPrompt = (message, callback, defaultValue = '') => {
      const dialog = document.getElementById('prompt-dialog');
      const msgTitle = document.getElementById('prompt-message');
      const input = document.getElementById('prompt-input');
      const btnConfirm = document.getElementById('prompt-confirm');

      msgTitle.innerText = message;
      input.value = defaultValue;
      dialog.showModal();

      // Limpa listeners antigos para não duplicar
      const newBtn = btnConfirm.cloneNode(true);
      btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

      newBtn.onclick = (e) => {
        e.preventDefault();
        dialog.close();
        if (callback) callback(input.value);
      };

      dialog.querySelector('button[value="cancel"]').onclick = (e) => {
        e.preventDefault();
        dialog.close();
      };
    };

    // Botão TEXTO
    document.getElementById('btn-text').onclick = () => {
      showCustomPrompt('Digite o texto:', (text) => {
        if (text) createText(text);
      }, 'Novo Modelo de Texto');
    };

    // Botão IA (Auto-Cut / Highlights)
    document.getElementById('btn-ai').onclick = () => {
      showCustomPrompt('Escolha a IA: [1] Auto-Cut, [2] Highlights, [3] Shorts', (action) => {
        let apiAction = '';
        if (action === '1') apiAction = 'autocut';
        if (action === '2') apiAction = 'highlights';
        if (action === '3') apiAction = 'shorts';

        if (apiAction) {
          // IA Iniciada: apiAction - Em produção: chamar API
        }
      });
    };

    // Botão de Exportação e Modal
    const dialog = document.getElementById('export-dialog');
    document.getElementById('btn-export').onclick = () => dialog.showModal();

    dialog.querySelector('button[value="cancel"]').onclick = (e) => {
      e.preventDefault();
      dialog.close();
    };

    document.getElementById('confirm-export').onclick = (e) => {
      e.preventDefault();
      const format = document.getElementById('export-format').value;
      // Redireciona para a nova API consolidada
      window.location.href = `api/export.php?format=${format}&project=MeuProjeto`;
      dialog.close();
    };
  }
};
