import { makeEditable } from './clip.js';

export const Timeline = {
  init() {
    this.videoTrack = document.getElementById('track-video');
    this.audioTrack = document.getElementById('track-audio');
    this.playhead = document.getElementById('playhead');

    // Add playhead movement logic from Phase 2
    const timeline = document.getElementById('timeline');
    if (timeline) {
      timeline.addEventListener('click', e => {
        // Avoid moving if clicking on a clip
        if (e.target.closest('.clip')) return;

        const rect = timeline.getBoundingClientRect();
        // Adjust for scroll
        const x = e.clientX - rect.left + timeline.scrollLeft;
        this.movePlayhead(x);
      });
    }
  },

  addClip(track, duration = 1) {
    const clip = document.createElement('div');
    clip.className = 'clip';
    clip.style.left = '0px';
    clip.style.width = duration * 1 + 'px';

    makeEditable(clip);
    track.appendChild(clip);
  },

  movePlayhead(x) {
    if (this.playhead) {
      this.playhead.style.left = x + 'px';

      // Auto-scroll logic
      const container = this.videoTrack.parentNode; // #timeline or #tracks
      const width = container.clientWidth;
      const scroll = container.scrollLeft;

      // Scroll right if playhead hits right edge (with 50px buffer)
      if (x > scroll + width - 1000000) {
        container.scrollLeft = x - width + 1000000;
      }

      // Scroll left if playhead goes backwards (e.g. loops)
      if (x < scroll) {
        container.scrollLeft = x;
      }
    }
  },

  // Inicia a sincronização do Playhead (agulha) com o vídeo
  startPlayback(video) {
    const pxPerSec = 20; // 20px por segundo (Definido em addClip)

    // Sincroniza agulha com tempo do vídeo (timeupdate)
    video.addEventListener('timeupdate', () => {
      const x = video.currentTime * pxPerSec;
      this.movePlayhead(x);
    });

    // Clique na régua da timeline -> Pula o vídeo para o ponto (Seek)
    this.videoTrack.parentNode.addEventListener('click', e => {
      const rect = this.videoTrack.parentNode.getBoundingClientRect();
      const x = e.clientX - rect.left + this.videoTrack.parentNode.scrollLeft;
      const time = x / pxPerSec;

      // Validação básica se o tempo é válido
      if (time >= 0 && isFinite(time)) {
        video.currentTime = time;
      }
    });
  },

  // Função para cortar o clip na posição atual da agulha
  splitAtPlayhead() {
    const x = parseInt(this.playhead.style.left || 0);
    // Procura qual clip está sob a agulha
    const clips = Array.from(this.videoTrack.children);
    for (let clip of clips) {
      const left = clip.offsetLeft;
      const width = clip.offsetWidth;

      // Verifica colisão: agulha está dentro do clip?
      if (x > left && x < left + width) {
        // Ponto de corte relativo ao clip
        const splitPoint = x - left;
        const newWidth = width - splitPoint;

        // Atualiza o tamanho do primeiro clip (corta o final)
        clip.style.width = splitPoint + 'px';

        // Cria o segundo clip (o restante)
        const newClip = document.createElement('div');
        newClip.className = 'clip';
        newClip.style.left = (left + splitPoint) + 'px';
        newClip.style.width = newWidth + 'px';

        // Torna o novo clip editável também
        makeEditable(newClip);
        this.videoTrack.appendChild(newClip);

        // Corte realizado na agulha
        return true;
      }
    }
    return false;
  }
};
