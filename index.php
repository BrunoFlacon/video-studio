<?php
$nonce = base64_encode(random_bytes(16));
header("Content-Security-Policy: default-src 'self' data: blob:; script-src 'self' 'nonce-$nonce' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' ws: blob:; base-uri 'self'; object-src 'none';");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <title>Video Studio Live PRO</title>
  <link rel="stylesheet" href="assets/css/editor.css">
  <link rel="manifest" href="manifest.json">
</head>

<body>

  <header class="topbar">
    <div class="logo">🎬 Video Studio Live PRO</div>
    <div id="toolbar">
      <button class="tool-btn" id="btn-cut" title="Cortar (Split)">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path
            d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
        </svg>
        <span>Cortar</span>
      </button>
      <button class="tool-btn" id="btn-text" title="Adicionar Texto">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z" />
        </svg>
        <span>Texto</span>
      </button>
      <button class="tool-btn" id="btn-ai" title="Ferramentas IA">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path
            d="M21 11.5v-1c0-.8-.7-1.5-1.5-1.5H16V6c0-.8-.7-1.5-1.5-1.5h-4C9.7 4.5 9 5.2 9 6v3H5.5C4.7 9 4 9.7 4 10.5v1C2.9 11.5 2 12.4 2 13.5v6c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2zM9 6h6v3H9V6zm11 13.5c0 .3-.2.5-.5.5h-15c-.3 0-.5-.2-.5-.5v-6c0-.3.2-.5.5-.5h15c.3 0 .5.2.5.5v6z" />
        </svg>
        <span>IA Auto</span>
      </button>
      <button class="tool-btn" id="btn-export" title="Exportar">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
        <span>Exportar</span>
      </button>
    </div>
  </header>

  <main id="editor">
    <section id="preview">
      <video id="videoPreview" controls></video>
    </section>
    <section id="timeline">
      <div class="track" id="track-video"></div>
      <div class="track" id="track-audio"></div>
      <div class="playhead" id="playhead"></div>
    </section>
  </main>

  <!-- Modals -->
  <dialog id="export-dialog">
    <form method="dialog">
      <h3>Exportar Projeto</h3>
      <select id="export-format" name="format">
        <option value="mp4">MP4 (Render Local)</option>
        <option value="xml">Premiere (XML)</option>
        <option value="edl">DaVinci (EDL)</option>
        <option value="shorts">YouTube Shorts (Vertical)</option>
      </select>
      <div class="actions">
        <button value="cancel" name="cancel">Cancelar</button>
        <button id="confirm-export" value="confirm">Exportar</button>
      </div>
    </form>
  </dialog>

  <dialog id="prompt-dialog">
    <form method="dialog">
      <h3 id="prompt-message">Entrada de Dados</h3>
      <input type="text" id="prompt-input" name="prompt_value" autocomplete="off">
      <div class="actions">
        <button value="cancel" name="cancel">Cancelar</button>
        <button value="confirm" id="prompt-confirm" name="confirm">OK</button>
      </div>
    </form>
  </dialog>

  <script type="module" src="assets/js/main.js?v=<?php echo time(); ?>" nonce="<?php echo $nonce; ?>"></script>
  <script nonce="<?php echo $nonce; ?>">
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }
  </script>
</body>

</html>