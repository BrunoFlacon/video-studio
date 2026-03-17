<?php
// Gera um nonce seguro para esta requisição
$nonce = bin2hex(random_bytes(16));

// Define a política de segurança (CSP)
// Removemos wildcards (*), adicionamos base-uri e object-src conforme boas práticas de segurança
header("Content-Security-Policy: default-src 'self' data: blob:; script-src 'self' 'nonce-$nonce' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.openai.com ws: wss: blob:; base-uri 'self'; object-src 'none';");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8" />
    <title>Video Studio Live-PRO – Editor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <link rel="stylesheet" href="assets/css/editor.css" />
    <link rel="stylesheet" href="assets/css/timeline.css" />
    <link rel="stylesheet" href="assets/css/sidebar-menu.css" />
    <link rel="stylesheet" href="assets/css/panels.css">
    <link rel="stylesheet" href="assets/css/modals.css">
    <base href="<?php echo str_replace('editor.php', '', $_SERVER['SCRIPT_NAME']); ?>">
</head>

<body>

    <div class="editor">

        <aside class="sidebar">
            <h3><span class="menu-icon">
                    <svg viewBox="0 0 16 16" width="18px" height="18px" fill="currentColor" class="save-icon">
                        <path
                            d="M10.451 8.118a.5.5 0 0 1 0 .707l-2.646 2.646a.667.667 0 0 1-.943 0L5.215 9.825a.5.5 0 0 1 0-.707l.236-.236a.5.5 0 0 1 .707 0l1.175 1.175 2.175-2.175a.5.5 0 0 1 .708 0l.235.236Z">
                        </path>
                        <path d="M8 2a4.667 4.667 0 0 0-4.611 5.39A3.334 3.334 0 0 0 4 14h8a3.333 3.333 0 0 0 .611-6.61A4.667 4.667 0 0 0 8 2ZM3.632 8.7l1.273-.236-.199-1.28a3.333 3.333 0 1 1 
                    6.587 0l-.198 1.28 1.273.236A2.001 2.001 0 0 1 12 12.667H4A2 2 0 0 1 3.632 8.7Z"></path>
                    </svg>
                </span>
                <label for="projectName" class="label-white">
                    <input type="text" id="projectName" class="project-name" value="Nome do Projeto.xml"
                        name="projectName" placeholder="Nome do Projeto.xml" aria-label="Nome do projeto">
            </h3></label>

            <div class="menu-section collapsed" id="toolbarSection">
                <h5 class="section-toggle" id="toggleToolbar" data-target="toolbarSection"
                    aria-controls="toolbarSection" aria-expanded="false" role="button">
                    Barra de Ferramentas
                    <span class="menu-arrow">▼</span>
                </h5>
                <nav class="sidebar-menu menu-section-content">
                    <!-- MENU ARQUIVO -->
                    <div class="menu-section collapsed">
                        <div class="menu-section-header">
                            <span class="menu-icon">
                                <svg viewBox="0 0 24 24" width="18px" height="18px" fill="currentColor">
                                    <path
                                        d="m7.358 12.696-1.91.354A3.001 3.001 0 0 0 6 19h3v2H6a5 5 0 0 1-.917-9.916 7 7 0 
                            1 1 13.833 0A5.002 5.002 0 0 1 18 21h-3v-2h3a3 3 0 0 0 .552-5.95l-1.91-.354.298-1.92a5 5 0 1 0-9.88 0l.298 1.92Z">
                                    </path>
                                    <path d="M15.854 16.146a.5.5 0 0 0 0-.707l-3.147-3.146a1 1 0 0 0-1.414 0l-3.147 3.146a.5.5 
                            0 0 0 0 .707l.708.708a.5.5 0 0 0 .707 0L11 15.414V20.5a.5.5 0 0 
                            0 .5.5h1a.5.5 0 0 0 .5-.5v-5.086l1.44 1.44a.5.5 0 0 0 .706 0l.708-.708Z"></path>
                                </svg></span>
                            <span class="menu-title">Arquivo</span>
                            <span class="menu-arrow">▼</span>
                        </div>
                        <div class="menu-section-content">
                            <button type="button" id="menuNew" name="menu_new" class="menu-btn">
                                <span>Nova Sequência</span>
                                <span class="shortcut">CTRL+N</span>
                            </button>
                            <button type="button" id="menuAbrir" name="menu_open" class="menu-btn">
                                <span>Abrir Projeto</span>
                                <span class="shortcut">CTRL+O</span>
                            </button>
                            <button type="button" id="menuAbrirRecentes" name="menu_open_recent"
                                class="menu-btn has-submenu">
                                <span>Abrir Recentes</span>
                                <span class="submenu-arrow">▶</span>
                            </button>
                            <button type="button" id="menuSave" name="menu_save" class="menu-btn">
                                <span>Salvar</span>
                                <span class="shortcut">CTRL+S</span>
                            </button>
                            <button type="button" id="menuSalvarcomo" name="menu_save_as" class="menu-btn">
                                <span>Salvar como...</span>
                                <span class="shortcut">CTRL+SHIFT+S</span>
                            </button>
                            <button type="button" id="menuRename" name="menu_rename" class="menu-btn">
                                <span>Renomear</span>
                                <span class="shortcut">CTRL+R</span>
                            </button>
                            <button type="button" id="btnImportMedia" name="import_media"
                                class="menu-btn menu-btn-special">
                                <span>Importar Mídia</span>
                                <span class="shortcut">CTRL+I</span>
                            </button>
                            <!-- Hidden file inputs -->
                            <input type="file" id="mediaInput" name="media_files[]" accept="video/*,audio/*" multiple
                                hidden />
                            <input type="file" id="projectInput" name="project_file" accept=".xml,.prproj,.dra,.drp"
                                hidden />
                        </div>
                    </div>
                </nav>
            </div>

            <div class="menu-section collapsed" id="toolsSection">
                <div class="sidebar-header">
                    <h5 class="section-toggle" id="toggleTools" data-target="toolsSection" aria-controls="toolsSection"
                        aria-expanded="false">
                        Menu de Ações <span class="menu-arrow">▼</span>
                    </h5>
                </div>
                <div class="menu-section-content">
                    <!-- MENU EDITAR -->
                    <div class="menu-section collapsed">
                        <div class="menu-section-header">
                            <span class="menu-title">Editar</span>
                            <span class="menu-arrow">▼</span>
                        </div>
                        <div class="menu-section-content">
                            <button type="button" id="menuTranscrever" name="menu_transcribe" class="menu-btn">
                                <span>Transcrever Mídia</span>
                                <span class="shortcut">CTRL+T</span>
                            </button>
                            <button type="button" id="btnAddLower" name="add_lower_third" class="menu-btn">
                                <span>▬ Lower Third</span>
                            </button>
                            <button type="button" id="menuPlugins" name="menu_plugins" class="menu-btn has-submenu">
                                <span>Plugins</span>
                                <span class="submenu-arrow">▶</span>
                            </button>
                        </div>
                    </div>

                    <!-- MENU ADICIONAR -->
                    <div class="menu-section collapsed">
                        <div class="menu-section-header">
                            <span class="menu-title">Adicionar</span>
                            <span class="menu-arrow">▼</span>
                        </div>
                        <div class="menu-section-content">
                            <button type="button" id="btnAddEfeitos" name="add_effects" class="menu-btn has-submenu">
                                <span>Efeitos</span>
                                <span class="submenu-arrow">▶</span>
                            </button>
                            <button type="button" id="btnAddCamada" name="add_layer" class="menu-btn has-submenu">
                                <span>Camada</span>
                                <span class="submenu-arrow">▶</span>
                            </button>
                            <button type="button" id="btnAddFiltros" name="add_filters" class="menu-btn has-submenu">
                                <span>Filtros</span>
                                <span class="submenu-arrow">▶</span>
                            </button>
                            <button type="button" id="btnAddPreset" name="add_preset" class="menu-btn has-submenu">
                                <span>Pré-Set</span>
                                <span class="submenu-arrow">▶</span>
                            </button>
                            <button type="button" id="btnAddText" name="add_text" class="menu-btn">
                                <span>🅰️ Texto Simples</span>
                            </button>
                            <button type="button" id="btnHistorico" name="btn_history" class="menu-btn has-submenu">
                                <span>Histórico</span>
                                <span class="submenu-arrow">▶</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="menu-section collapsed" id="searchReplaceSection">
                <div class="sidebar-header">
                    <h5 class="section-toggle" id="toggleSearchReplace" data-target="searchReplaceSection"
                        aria-controls="searchReplaceSection" aria-expanded="false">
                        Localizar e Substituir<span class="menu-arrow">▼</span>
                    </h5>
                </div>
                <div class="menu-section-content">
                    <div class="prop-row">
                        <label id="labelSearchQuery" for="searchQuery">Localizar:</label>
                        <input type="text" id="searchQuery" name="searchQuery" class="ui-input search-replace"
                            placeholder="Buscar nos textos..." autocomplete="off"
                            jslog="TextField; context: search; track: change, keydown: Enter">
                    </div>
                    <div class="prop-row">
                        <label id="labelReplaceQuery" for="replaceQuery">Substituir:</label>
                        <input type="text" id="replaceQuery" name="replaceQuery" class="ui-input search-replace"
                            placeholder="Substituir" autocomplete="off"
                            jslog="TextField; context: replace; track: change, keydown: Enter">
                    </div>
                    <button type="button" id="btnApplyReplace" name="apply_replace"
                        class="btn-primary btn-full">Substituir
                        Tudo</button>
                </div>
            </div>

            <div class="panel properties hidden" id="textProps">
                <h4>Editar Texto</h4>

                <div class="prop-row">
                    <label for="propText">Texto:</label>
                    <input type="text" id="propText" name="prop_text" class="ui-input" placeholder="Seu texto aqui">
                </div>

                <div class="prop-row">
                    <label for="propColor">Cor:</label>
                    <input type="color" id="propColor" name="prop_color" value="#ffffff">
                </div>

                <div class="prop-row">
                    <label for="propSize">Tamanho:</label>
                    <input type="range" id="propSize" name="prop_size" min="12" max="100" value="24"
                        aria-label="Tamanho do texto">
                </div>

                <div class="prop-row">
                    <label for="propShadow">
                        <input type="checkbox" id="propShadow" name="prop_shadow" value="1"> Sombra
                    </label>
                </div>
            </div>

            <div class="menu-section collapsed" id="librarySection">
                <div class="sidebar-header" style="margin-top: 20px;">
                    <h5 class="section-toggle" id="toggleLibrary" data-target="librarySection"
                        aria-controls="librarySection" aria-expanded="false">
                        Biblioteca<span class="menu-arrow">▼</span>
                    </h5>
                </div>
                <div class="menu-section-content">
                    <h3 class="media-library-title">
                        <span><svg viewBox="0 0 24 24" fill="none" height="18px" width="18px">
                                <path fill="currentColor" clip-rule="evenodd" fill-rule="evenodd"
                                    d="M4.75 4.5h7.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V5.25a.75.75 0 0 1 .75-.75ZM2 5.25A2.75 2.75 0 0 1 4.75 2.5h7.5A2.75 2.75 0 0 1 15 5.25v13.5a2.75 2.75 0 0 1-2.75 2.75h-7.5A2.75 2.75 0 0 1 2 18.75V5.25ZM20.8 2.853L21 7.064v9.872l1.8-1.04V8.104ZM19 5.91l-2-1.154v14.49l2-1.154V5.909Z">
                                </path>
                            </svg>
                        </span>Arquivos do Projeto
                    </h3>
                    <div id="mediaLibrary" class="media-library"></div>
                </div>
            </div>
        </aside>
        <button type="button" id="toggleSidebar" name="toggle_sidebar" class="toggle-sidebar-btn"
            title="Ocultar Sidebar">◀</button>

        <main class="workspace">
            <header class="toolbar">
                <div class="toolbar-left">
                    <div class="logo"><svg viewBox="0 0 64 64" fill="currentColor" width="38" height="38">
                            <path
                                d="M25.9,34c6,3.8,11.8,7.5,17.8,11.3c-5.9,3.7-11.8,7.4-17.8,11.2C25.9,48.9,25.9,41.5,25.9,34z" />
                            <path
                                d="M60,0.5c0.7,3.8,1.5,7.6,2.2,11.4c-10.4,2.1-20.8,4.2-31.2,6.3c0,0.1,0,0.1,0,0.2c10.5,0,21,0,31.5,0c0,0.4,0,0.7,0,1   c0,11.7,0,23.5,0,35.2c0,4.3-2.8,7.8-7,8.7c-0.9,0.2-1.8,0.3-2.8,0.3c-14.3,0-28.5,0.1-42.8,0c-4.8,0-8.7-3.5-8.7-8.6   c-0.1-12.6,0-25.1,0-37.7c0-1.7,0.8-3.1,2-4.3c1.1-1.1,2.4-1.3,3.7-1.6c6.2-1.2,12.3-2.4,18.5-3.7C34,6,42.5,4.3,50.9,2.6   C53.9,1.9,56.9,1.2,60,0.5z M7.3,33.2c0,0.3,0,0.5,0,0.7c0,6.8,0,13.5,0,20.3c0,2.2,1.1,3.3,3.4,3.3c14.2,0,28.4,0,42.6,0   c0.4,0,0.7,0,1.1-0.1c1.5-0.3,2.3-1.4,2.3-3.2c0-6.8,0-13.5,0-20.3c0-0.2,0-0.4-0.1-0.7C40.2,33.2,23.8,33.2,7.3,33.2z M45.1,6.8   c0.6,0.5,1.1,0.9,1.7,1.3c1.1,0.8,2.3,1.5,3.4,2.3c0.6,0.5,1.2,0.6,2,0.4c0.8-0.2,1.7-0.3,2.5-0.5c1.3-0.3,2.5-0.5,3.9-0.8   c-2-1.4-3.8-2.7-5.7-3.9c-0.2-0.2-0.6-0.2-0.9-0.1C49.9,5.8,47.6,6.3,45.1,6.8z M30.1,9.9c0.3,0.2,0.5,0.4,0.8,0.5   c1,0.7,2,1.2,2.9,2c1.3,1.2,2.6,2.1,4.5,1.3c0.3-0.1,0.6-0.1,0.9-0.2c1.5-0.3,3-0.6,4.5-0.9c-0.1-0.1-0.1-0.2-0.2-0.3   c-1.9-1.3-3.7-2.5-5.6-3.8c-0.1-0.1-0.4-0.2-0.6-0.1C35,9,32.6,9.4,30.1,9.9z M15.2,13c0,0.1,0,0.1,0,0.2c1.9,1.3,3.8,2.6,5.7,3.8   c0.2,0.1,0.4,0.1,0.6,0c1.2-0.2,2.5-0.5,3.7-0.7c1.1-0.2,2.1-0.4,3.4-0.7c-0.5-0.3-0.8-0.6-1.1-0.8c-1.2-0.9-2.4-1.8-3.7-2.6   c-0.5-0.4-1-1-1.8-0.8C19.7,12,17.4,12.5,15.2,13z M28.9,21.6c-0.3-0.1-0.4-0.1-0.4-0.1c-2.3,0-4.6,0-6.9,0c-0.3,0-0.6,0.2-0.7,0.4   c-0.9,0.9-1.7,1.8-2.6,2.7c-0.7,0.7-1.4,1.3-2.1,2.1c0.2,0.1,0.3,0.1,0.3,0.1c2.3,0,4.7,0,7,0c0.2,0,0.4-0.1,0.6-0.2   C25.7,25,27.2,23.4,28.9,21.6z M31.5,26.7c0.2,0.1,0.3,0.1,0.4,0.1c2.3,0,4.7,0,7,0c0.2,0,0.5-0.2,0.7-0.3c1.1-1.1,2.2-2.2,3.3-3.3   c0.5-0.5,0.9-1.1,1.5-1.7c-2.5,0-4.9,0-7.3,0c-0.2,0-0.5,0.2-0.7,0.4c-0.9,1-1.8,1.9-2.8,2.9C32.8,25.4,32.2,26,31.5,26.7z    M59.6,21.7c0-0.1-0.1-0.1-0.1-0.2c-2.4,0-4.8,0-7.2,0c-0.2,0-0.4,0.1-0.6,0.3c-1.6,1.6-3.1,3.2-4.7,4.8c0,0,0,0.1,0,0.2   c2.4,0,4.8,0,7.2,0c0.2,0,0.4-0.1,0.5-0.2C56.4,25,58,23.4,59.6,21.7z" />
                        </svg> Studio Live-PRO</div>
                </div>

                <div class="toolbar-center">
                    <div class="toolbar-tools">
                        <button type="button" id="btnSelect" name="tool_select" class="tool-btn active"
                            title="Seleção (V)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3zM13 13l6 6" />
                            </svg>
                        </button>
                        <button type="button" id="btnHand" name="tool_hand" class="tool-btn" title="Mão (H)">
                            <svg viewBox="0 0 24 24" class="hand-icon" stroke-width="2" data-follow-fill="currentColor"
                                fill-rule="evenodd" clip-rule="evenodd">
                                <path
                                    d="M9.875 2.73a2.24 2.24 0 0 1 4.238-.035A2.24 2.24 0 0 1 17.12 4.8v.733A2.24 2.24 0 0 1 20 7.68V15c0 2.198-.74 4.047-2.016 5.35-1.275 1.303-3.037 2.01-4.984 2.01-2.952 0-5.424-1.977-7-4.183l-.146-.204-2.798-3.731a2.42 2.42 0 0 1-.411-.865c-.517-2.068 1.697-3.746 3.548-2.688l.054.03c.148.085.287.186.415.3l.218.194V4.84a2.24 2.24 0 0 1 2.995-2.11Zm1.485 7.77a.8.8 0 1 1-1.6 0V4.84a.64.64 0 1 0-1.28 0V13a.8.8 0 0 1-1.333.597l-1.55-1.385a.85.85 0 0 0-.144-.103l-.054-.031a.82.82 0 0 0-1.063 1.204L7.14 17.02l.011.015.152.212c1.429 2.001 3.48 3.513 5.697 3.513 1.553 0 2.89-.558 3.84-1.529.95-.969 1.56-2.4 1.56-4.231V7.68a.64.64 0 1 0-1.28 0v2.82a.8.8 0 1 1-1.6 0V4.8a.64.64 0 1 0-1.28 0v5.7a.8.8 0 1 1-1.6 0V3.44a.64.64 0 1 0-1.28 0v7.06Z"
                                    fill="currentColor"></path>
                            </svg>
                        </button>
                        <div class="tool-separator"></div>
                        <button type="button" id="btnUndo" name="tool_undo" class="tool-btn" title="Desfazer (Ctrl+Z)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 10h10a5 5 0 010 10H11M3 10l4-4M3 10l4 4" />
                            </svg>
                        </button>
                        <button type="button" id="btnRedo" name="tool_redo" class="tool-btn" title="Refazer (Ctrl+Y)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10H11a5 5 0 000 10h2M21 10l-4-4M21 10l-4 4" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="toolbar-right">
                    <div class="export-controls">
                        <select id="exportPreset" name="export_preset" class="ui-select">
                            <option value="hd">HD (1280 x 720) (16:9)</option>
                            <option value="fullhd" selected>FULL-HD (1920 x 1080) (16:9)</option>
                            <option value="4k">4K UHD (3840 x 2160) (16:9)</option>
                            <option value="vertical">VERTICAL (1080 x 1920) (9:16)</option>
                            <option value="square">INSTAGRAM (1080 x 1080) (1:1)</option>
                        </select>
                        <button type="button" id="exportBtn" name="export_btn" class="btn-primary">Exportar</button>
                    </div>
                </div>
            </header>

            <div class="preview-container">
                <!-- EMPTY STATE -->
                <div id="emptyState" class="empty-state">
                    <div class="empty-state-content">
                        <h2 class="empty-title">Seu projeto começa aqui</h2>
                        <p class="empty-subtitle">Escolha de onde importar seus arquivos</p>

                        <div class="cloud-buttons-grid">
                            <button type="button" class="cloud-service-btn" id="btnImportGDrive" name="import_gdrive"
                                data-service="google-drive" title="Google Drive">
                                <svg viewBox="0 0 60 60" class="cloud-icon" alt="Google Drive">
                                    <path
                                        d="M45.6583 48.1474L23.1273 10.1969C23.6814 9.93928 24.2915 9.7998 24.9209 9.7998H35.0789C36.6155 9.7998 38.0364 10.631 38.8107 11.9828L51.4114 33.9828C52.1961 35.3528 52.1961 37.0468 51.4114 38.4168L46.3711 47.2168C46.1729 47.5629 45.9323 47.8748 45.6583 48.1474Z"
                                        fill="#FCB900" />
                                    <path
                                        d="M14.348 48.1474L36.8789 10.1969C36.3248 9.93928 35.7148 9.7998 35.0853 9.7998H24.9273C23.3907 9.7998 21.9698 10.631 21.1956 11.9828L8.59483 33.9828C7.81015 35.3528 7.81016 37.0468 8.59483 38.4168L13.6351 47.2168C13.8333 47.5629 14.0739 47.8748 14.348 48.1474Z"
                                        fill="#02AA49" />
                                    <path
                                        d="M23.1289 10.1993L30.0033 21.7784L36.8778 10.1993C36.3223 9.94014 35.7105 9.7998 35.0791 9.7998H24.9276C24.2962 9.7998 23.6844 9.94014 23.1289 10.1993Z"
                                        fill="#01832C" />
                                    <path
                                        d="M52 36.1997H8C8 36.9657 8.19617 37.7317 8.58851 38.4167L13.6288 47.2167C14.403 48.5685 15.824 49.3997 17.3605 49.3997H42.6395C44.176 49.3997 45.597 48.5685 46.3712 47.2167L51.4115 38.4167C51.8038 37.7317 52 36.9657 52 36.1997Z"
                                        fill="#2785FC" />
                                    <path
                                        d="M21.4411 36.1997L14.3479 48.1473C14.0738 47.8747 13.8332 47.5628 13.635 47.2167L8.59473 38.4167C8.2024 37.7317 8.00623 36.9657 8.00623 36.1997H21.4411Z"
                                        fill="#0364D7" />
                                    <path
                                        d="M38.5649 36.1997L45.6581 48.1473C45.9322 47.8747 46.1728 47.5628 46.371 47.2167L51.4113 38.4167C51.8036 37.7317 51.9998 36.9657 51.9998 36.1997H38.5649Z"
                                        fill="#E54635" />
                                </svg>
                                <span class="cloud-label">Google Drive</span>
                            </button>

                            <button type="button" class="cloud-service-btn" id="btnImportDropbox" name="import_dropbox"
                                data-service="dropbox" title="Dropbox">
                                <span class="cloud-label">
                                    <svg viewBox="0 0 24 24" alt="dropbox" fill="#0848e1" class="cloud-icon">
                                        <path
                                            d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z" />
                                    </svg>Dropbox</span>
                            </button>
                            <button type="button" class="cloud-service-btn" id="btnImportOneDrive"
                                name="import_onedrive" data-service="onedrive" title="OneDrive">
                                <svg viewBox="0 0 48 48" alt="OneDrive" class="cloud-icon">
                                    <path fill="#1565c0"
                                        d="M40.429,35.999c0,0,2.89-0.393,3.47-3.185C43.964,32.502,44,32.161,44,31.787 c0-0.233-0.015-0.454-0.044-0.665c-0.428-3.158-3.852-3.868-3.852-3.868s0.595-3.401-2.543-5.183c-3.138-1.78-6.005,0-6.005,0 s-1.678-3.401-6.222-3.401c-5.843,0-6.817,6.64-6.817,6.64S13,25.636,13,30.493C13,35.352,18.031,36,18.031,36L40.429,35.999 L40.429,35.999z" />
                                    <path fill="#1565c0"
                                        d="M11,30.493c0-4.395,3.286-6.319,5.875-6.945c0.898-2.954,3.384-6.878,8.46-6.878 c0.006,0,0.011,0.001,0.017,0.001c0.007,0,0.013-0.001,0.02-0.001c3.522,0,5.71,1.646,6.892,2.953 c0.65-0.191,1.448-0.343,2.347-0.343c0.004,0,0.007,0.001,0.011,0.001c0.003,0,0.006,0,0.01,0c0.02,0,0.039,0.004,0.059,0.004 C34.729,19,34.063,12,26.013,12c-5.503,0-7.446,4.691-7.446,4.691s-3.992-2.965-8.092,1.133c-2.105,2.104-1.619,5.338-1.619,5.338 S4,23.648,4,28.825C4.001,33.515,9.018,34,9.018,34h2.807C11.32,33.041,11,31.886,11,30.493z" />
                                </svg>

                                <span class="cloud-label">OneDrive</span>
                            </button>
                        </div>
                    </div>
                </div>

                <video id="previewVideo" class="hidden" controls playsinline muted></video>
                <div id="timeDisplay" class="time-display">00:00 / 00:00</div>
                <div id="overlayLayer" class="overlay-layer"></div>
            </div>


            <div class="timeline-container">
                <header class="timeline-header">
                    <div class="timeline-header-tools">
                        <button type="button" id="btnCutTimeline" name="cut_timeline" class="tool-btn"
                            title="Cortar (C)" aria-label="Cortar vídeo"><svg viewBox="0 0 64 64" alt="Cortar"
                                fill="currentColor" width="28" height="28">
                                <path
                                    d="M62.3,39.3c-0.2-0.2-0.3-0.4-0.5-0.5c-1.4-1.4-2.8-2.8-4.2-4.3l-3-3.1c-5.5-5.5-11-11-16.4-16.6l-1.5-1.5c-2-2-4-4-6-6.1   l-4-4.1c-0.4-0.4-0.8-0.8-1.2-1.2l-1.2-1l-0.6,0.6c-0.5,0.5-1,1-1.5,1.5L21.4,4l0.2,0.6c0,0.1,0.1,0.2,0.1,0.2c0.1,0.5,0,1-0.3,1.5   c-0.1,0.1-0.2,0.2-0.4,0.4c0,0,0,0-0.1,0.1c-0.6,0.4-0.9,0.3-1.6-0.4l-0.5-0.6c-0.8-0.7-1.9-1-2.9-0.7l-0.3,0.1   c-0.1,0.1-0.3,0.1-0.4,0.2c-0.2,0.1-0.3,0.2-0.5,0.4c-0.1,0.1-1.1,1.1-2.4,2.3c-2,2-4.7,4.6-5.1,5.1l-1.3,1.3   c-1.2,1.2-1.2,2.7,0.1,4l0.2,0.2c0.2,0.2,0.4,0.4,0.6,0.6C6.9,19.5,7,19.7,7,19.9c0,0.9-0.7,1.5-1.5,1.5c-0.3,0-0.6-0.1-0.8-0.1   l-0.6-0.1L1,24.2l0.8,0.8c0.1,0.1,0.2,0.2,0.3,0.3c5.8,5.9,11.6,11.7,17.4,17.6c2.2,2.2,4.3,4.4,6.5,6.6l6,6.1   c2.2,2.2,4.5,4.5,6.7,6.7c0.1,0.1,0.1,0.2,0.2,0.2l0.8,0.8l0.7-0.7c0.1-0.1,0.2-0.2,0.3-0.3c0.1-0.1,0.2-0.2,0.3-0.3l0.3-0.2   c0.2-0.2,0.5-0.5,0.8-0.8l0.9-0.9l-0.3-0.6c-0.2-0.6-0.3-1.4,0.5-2c0.8-0.6,1.2-0.4,2.1,0.6c0.7,0.8,1.4,1.1,2.2,1.2   c0.5,0,1.3-0.2,2.2-1.1l4.2-4.1c1.2-1.2,2.4-2.4,3.2-3.2c0.5-0.5,0.9-0.9,1-1c0.2-0.2,0.3-0.3,0.4-0.5c0.8-1.2,0.6-2.7-0.3-3.8   c-0.3-0.3-0.5-0.6-0.8-0.8c-0.4-0.3-0.3-0.7-0.2-0.9c0.1-0.2,0.2-0.5,0.4-0.6c0.1-0.1,0.2-0.2,0.3-0.3c0.1-0.1,0.1-0.1,0.1-0.1   l0.1-0.1c0.1,0,0.1-0.1,0.2-0.1c0.4-0.1,0.8-0.1,1.2,0.1l0.6,0.2l3-3L62.3,39.3z M52.4,52.6l-2.8,2.8L48,53.7   c-2-2.1-4.7-4.9-5.6-5.8l-0.6-0.6l-0.7,0.4c-1.8,1.1-2.7,0.6-3.2,0c-0.8-0.8-0.8-1.9,0-2.8c0.1-0.1,0.2-0.2,0.3-0.3L39,44l-1.8-1.9   c-0.4-0.4-0.8-0.8-1.2-1.2l-2.1-2.2c-0.1-0.1-0.3-0.3-0.4-0.5c-0.5-0.6-1-1-2-0.9c-1.4,0.1-2.8-0.5-3.8-1.5   c-1.1-1.1-1.6-2.7-1.4-4.2c0-0.2,0-0.2,0-0.3V31l-0.3-0.4c-1.1-1.1-2.2-2.2-3.2-3.3L20,24.6l-0.7,0.7c-1.1,1-2,1.1-3,0.3   c0,0-1.7-1.4-0.2-3.4l0.5-0.7l-0.6-0.6c-0.2-0.2-4.7-4.8-6.8-6.8c1-1,2.9-2.9,4.5-4.5C14,9.3,14.2,9,14.5,8.8   c1.3,1.4,7.1,7.1,7.4,7.4l0.7,0.7l0.7-0.6c1-0.9,2.1-1.1,2.4-1.1c0.5,0,1,0.2,1.4,0.6c0.4,0.4,0.6,0.9,0.5,1.5c0,0.3-0.1,0.6-0.3,1   c0,0.1-0.1,0.2-0.2,0.3c0,0.1-0.1,0.1-0.1,0.2c0,0.1-0.1,0.1-0.1,0.2c-0.2,0.2-0.3,0.3-0.5,0.5l-0.9,0.8l0.9,0.7   c0.3,0.2,0.5,0.4,0.8,0.7c0.6,0.6,1.2,1.1,1.8,1.7c0.8,0.8,1.6,1.6,2.5,2.5l0.4,0.4l0.5-0.1c2.1-0.4,3.8,0,5.2,1.4   c1.3,1.4,1.8,3,1.3,5l-0.1,0.5l0.4,0.4c1,1,2,1.9,3,2.9l0.4,0.3c0.6,0.6,1.3,1.2,2,1.8l0.7,0.6l0.7-0.6c0.1-0.1,0.3-0.3,0.5-0.4   c0.1-0.1,0.1-0.1,0.2-0.1l0.2-0.2c0.7-0.5,1.8-0.7,2.5,0.1c0.8,0.9,0.1,2.4-0.7,3.3l-0.6,0.7l0.6,0.7c0,0,5.1,5.5,6.9,7.4   C54.4,50.6,53.4,51.6,52.4,52.6z" />
                            </svg></button>

                        <button type="button" id="btnDeleteClip" name="delete_clip" class="tool-btn"
                            title="Excluir (Del)" aria-label="Excluir clipe selecionado">
                            <svg viewBox="0 0 24 24" width="2em" height="2em" class="trash-icon" fill="currentColor">
                                <path
                                    d="M12 3a4.999 4.999 0 0 0-4.386 2.597l1.733 1a3 3 0 0 1 5.308.006l1.733-1A4.999 4.999 0 0 0 12 3Zm-8.96 7h2.113l.633 8.23A3 3 0 0 0 8.778 21h6.444a3 3 0 0 0 2.991-2.77l.633-8.23h2.113l.536-2 .005.001V8H2.505l.536 2Zm4.74 8.077L7.16 10h9.68l-.621 8.077a1 1 0 0 1-.997.923H8.778a1 1 0 0 1-.997-.923ZM2.505 8H2.5v.001L2.505 8Z">
                                </path>
                            </svg></button>

                        <div class="tool-separator"></div>
                        <button type="button" id="btnSnap" name="snap_toggle" class="tool-btn" title="Snap / Imã (S)">
                            <svg viewBox="0 0 64 64" fill="currentColor" width="28" height="28">
                                <path
                                    d="M22.6,41.4l-0.1-1.9H7.5l-2,0.1v2c0,0.9,0,8.5,0,12.4c0,2.1,1.6,3.7,3.7,3.7c1,0,1.9,0,2.9,0c2.2,0,4.4,0,6.5,0h0.1   c1.1,0,2.1-0.4,2.8-1.1c0.7-0.7,1.1-1.7,1.1-2.8c0-2.5,0-6.7,0-9.5C22.6,41.5,22.6,41.5,22.6,41.4z M18.6,44.2c0,2.7,0,6.9,0,9.4   c-1.3,0-2.7,0-4,0h-2.5c-0.9,0-1.7,0-2.6,0c0-2.9,0-7.5,0-10.1h9.2V44.2z" />
                                <path
                                    d="M58.7,44.2c0-1.5,0-2.7,0-2.8l0-2h-17l0,2.4c0,1.7-0.1,8.5-0.1,12.1c0,2.1,1.6,3.7,3.7,3.7c1,0,1.9,0,2.9,0   c2.2,0,4.4,0,6.5,0h0.1c1.1,0,2.1-0.4,2.8-1.1c0.7-0.7,1.1-1.7,1.1-2.8C58.7,51.2,58.7,47,58.7,44.2z M50.8,53.6h-2.5   c-0.9,0-1.7,0-2.6,0c0-2.9,0-7.5,0-10.1h9c0,0.3,0,0.5,0,0.8c0,2.7,0,6.8,0.1,9.3C53.4,53.6,52.1,53.6,50.8,53.6z" />
                                <path
                                    d="M58.7,28.9c0.1-3.6-0.4-6.7-1.4-9.6c-0.9-2.7-2.4-5.3-4.2-7.7c-1.5-1.9-3.2-3.6-5.1-5c-1.2-0.9-2.6-1.7-4.4-2.6   c-1.2-0.6-2.5-1.1-3.8-1.5C34.1,1,28.6,1.1,23.6,2.8c-2.2,0.7-4.1,1.6-5.8,2.8c-1.3,0.8-2.5,1.8-3.7,2.8c-1.3,1.2-2.5,2.5-3.6,4   c-1.5,2.1-2.7,4.4-3.6,7c-0.9,2.6-1.4,5.3-1.4,8c0,2,0,4,0,5.9v2.1c0,0.2,0,0.3,0,0.4l0.1,1.9h16.9v-4.5c0-1.7,0-3.3,0-5   c0-2.3,0.6-4.2,1.8-5.9c1.2-1.6,2.7-2.8,4.6-3.4c0.8-0.3,1.8-0.5,3-0.5c2.2-0.1,4.1,0.5,5.8,1.8c0.8,0.6,1.5,1.3,2.1,2.1   c1.2,1.6,1.8,3.5,1.8,5.8v9.7h17l0-4.4C58.6,31.8,58.6,30.4,58.7,28.9z M54.8,33.3v0.6h-9.3v-5.8c0-3.1-0.8-5.8-2.5-8.1   c-0.8-1.1-1.8-2.1-2.9-3c-2.5-1.8-5.2-2.7-8.3-2.6c-1.5,0.1-2.9,0.3-4.1,0.7c-2.7,0.9-4.8,2.6-6.5,4.8c-1.7,2.4-2.5,5.1-2.5,8.2   c0,1.7,0,3.3,0,5v0.7H9.4v-0.6c0-2,0-3.9,0-5.9c0-2.2,0.4-4.5,1.2-6.7c0.7-2.2,1.8-4.2,3.1-5.9c1-1.3,2-2.4,3.1-3.4   c1-0.9,2-1.7,3.2-2.4c1.5-1,3.1-1.7,5-2.4c4.4-1.5,9-1.6,14-0.2c1,0.3,2,0.7,3,1.2c1.6,0.8,2.8,1.6,3.9,2.3   c1.6,1.2,3.1,2.6,4.4,4.2c1.6,2,2.8,4.2,3.6,6.6c0.9,2.5,1.3,5.2,1.2,8.3C54.8,30.3,54.8,31.8,54.8,33.3z" />
                                <path
                                    d="M37.8,58.8c-1-0.1-1.9-0.2-2.7-0.2c-1.2-0.1-1.7-1.7-1-2.4c0.1-0.2,0.2-0.4,0.4-0.5c1.2-1.6,2.3-3.1,3.5-4.6   c0,0,0.1-0.1,0.1-0.1c0.7,0.6,1.4,1.2,2.1,1.8c-0.8,1-1.5,2-2.3,3.1c0.9,0.1,1.7,0.2,2.5,0.2c1.4,0,2,1.6,1.2,2.5   c-0.7,0.9-1.4,1.8-2,2.8c-0.6,0.8-1.2,1.6-1.9,2.5c-0.7-0.6-1.4-1.2-2.1-1.8C36.2,60.9,36.9,59.9,37.8,58.8z" />
                                <path
                                    d="M27.3,58.1c-1.1-0.2-2-0.4-3-0.5c-1.3-0.2-1.7-2-0.9-2.8c0.2-0.2,0.3-0.4,0.4-0.5c1.4-1.6,2.9-3.2,4.3-4.8   c0,0,0.1-0.1,0.2-0.1c0.7,0.7,1.4,1.4,2.2,2.2c-0.9,1.1-1.9,2.1-2.9,3.3c1,0.2,1.9,0.4,2.8,0.5c1.5,0.1,2.1,2,1.1,2.9   c-0.9,0.9-1.7,1.9-2.5,2.9c-0.7,0.8-1.5,1.7-2.3,2.6c-0.7-0.7-1.4-1.5-2.2-2.2C25.4,60.3,26.3,59.3,27.3,58.1z" />
                            </svg></button>

                        <button type="button" id="btnRecAudio" name="rec_audio" class="tool-btn btn-record"
                            title="Gravar Áudio (Shift+R)">
                            <svg viewBox="0 0 24 24" width="2em" height="2em" fill="currentColor" stroke="1"
                                clip-rule="evenodd" fill-rule="evenodd">
                                <path
                                    d="M15 12V7a3 3 0 1 0-6 0v5a3 3 0 1 0 6 0ZM12 2a5 5 0 0 0-5 5v5a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5ZM5 13c.276 0 .497.225.527.5.292 2.74 2.965 5.063 6.473 5.063s6.181-2.324 6.473-5.064c.03-.274.25-.499.527-.499h1c.276 0 .502.225.482.5-.269 3.737-3.532 6.593-7.482 7.01v1.99a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1.99c-3.95-.417-7.213-3.273-7.482-7.01A.474.474 0 0 1 4 13h1Z">
                                </path>
                            </svg></button>

                        <button type="button" id="btnRecVideo" name="rec_video" class="btn-action rec-camera btn-record"
                            title="Gravar Vídeo (Shift+G)" aria-label="Gravar vídeo">
                        </button>

                        <div class="tool-separator"></div>
                        <button type="button" id="btnMarker" name="add_marker" title="Adicionar Marcador (M)"
                            class="tool-btn">
                            <svg viewBox="0 0 64 64" fill="currentColor" stroke-width="7.7491" width="28" height="28">
                                <polygon points="45.6,44.1 32,57.9 18.4,44.1   18.4,4.5 45.6,4.5 " />
                            </svg></button>

                        <button type="button" id="btnBatchSplit" name="batch_split" class="tool-btn"
                            title="Cortar em Lote (Markers)">
                            <svg viewBox="0 0 64 64" alt="Cortar em Lote" fill="currentColor" width="28" height="28">
                                <path
                                    d="M22.3,0.4c2.2,0.6,3.8,2.3,5.5,3.7c3.2,2.6,6.4,5.2,9.6,7.8c0.4,0.3,0.8,0.7,1.2,1c1.8,1.7,2,3.4,0.4,5.4   c-1.6,2.1-3.3,4.1-5,6.2c-2,2.5-4,5-6.1,7.4c-1.8,2.2-3.6,2.4-5.8,0.6c-4.4-3.6-8.9-7.2-13.3-10.8c-2.4-1.9-2.5-3.7-0.6-6.1   C11.6,11.4,15,7.2,18.4,3c0.9-1.1,1.9-2.1,3.4-2.5C21.9,0.4,22.1,0.4,22.3,0.4z M31.9,15.5c1.1,0.9,2.1,1.7,3.2,2.6   c0.6-0.8,1.1-1.5,1.6-2.3c-1-0.8-2-1.6-3-2.4C33,14.1,32.5,14.7,31.9,15.5z M11.9,16.2c-0.6,0.8-1.1,1.5-1.6,2.2   c1.1,0.9,2,1.6,3,2.5c0.6-0.7,1.1-1.4,1.7-2.2C13.9,17.9,12.9,17.1,11.9,16.2z M27.8,8.6c-0.6,0.7-1.2,1.4-1.8,2.2   c1,0.8,2,1.6,3,2.5c0.6-0.8,1.2-1.4,1.7-2.2C29.8,10.3,28.9,9.5,27.8,8.6z M25.1,6.3c-1-0.8-2-1.6-3-2.4c-0.6,0.8-1.2,1.5-1.8,2.2   c1,0.8,2,1.6,3,2.4C23.9,7.8,24.5,7.1,25.1,6.3z M20.8,23.5c-1.1-0.9-2-1.6-3-2.4c-0.6,0.8-1.1,1.4-1.7,2.2c1,0.8,2,1.6,3,2.4   C19.6,24.9,20.2,24.2,20.8,23.5z M21.8,27.9c1.1,0.9,2,1.6,3,2.4c0.6-0.7,1.1-1.4,1.7-2.1c-1.1-0.9-2-1.6-3-2.4   C22.9,26.5,22.4,27.1,21.8,27.9z" />
                                <path
                                    d="M30.1,48.2c0.3,0.2,1,0.1,1.4,0c3.2-1.4,6.7-0.6,9,2.1c2.1,2.5,2.2,6.3,0.3,9c-2.1,3-6.2,4-9.5,2.4   c-3.3-1.6-4.9-5.4-3.8-8.9c0.1-0.5,0.3-0.9,0.5-1.4c-1.6-1.5-3.2-2.9-4.9-4.4c-1.4,1.6-2.8,3.1-4.2,4.6c-0.1,0.2-0.1,0.6,0,0.8   c2.1,5.3,0.3,10-5.3,11c-1.5,0.3-3.4-0.1-5.2-1c-2.4-1.6-3-3-3.6-5.1c-0.1-0.6-0.4-1.9,0.4-3.7c1.7-3.9,5.6-6.1,9.5-4.6   c0.9,0.3,1.3,0.1,1.9-0.5c1.1-1.3,2.3-2.6,3.6-4c-4.8-4.3-9.5-8.6-14.3-13c0.9-1,1.7-1.8,2.5-2.8c1.8,1.7,3.6,3.3,5.4,4.9   C16.8,36.1,28.1,46.4,30.1,48.2z M12.3,52.3c-2,0-3.7,1.7-3.7,3.8c0,2,1.7,3.7,3.6,3.7c2,0,3.8-1.7,3.8-3.7   C16,54.1,14.2,52.3,12.3,52.3z M38.4,54.9c0-2.1-1.6-3.7-3.7-3.7c-2,0-3.7,1.7-3.7,3.6c0,2,1.7,3.8,3.7,3.8   C36.7,58.7,38.4,57,38.4,54.9z" />
                                <path
                                    d="M55,36.5c-2.7,3.5-5.6,6.9-8.4,10.3c-1.9,2.3-3.7,2.5-6.1,0.7c-1.8-1.4-3.6-2.8-5.3-4.3c-1.8-1.6-2.1-3.4-0.6-5.3   c3.8-4.7,7.6-9.4,11.4-14.1c1.3-1.5,3.5-1.8,5.1-0.6c2.1,1.6,4.1,3.3,6.1,5C60.3,30.7,60.1,30.2,55,36.5z M50.6,27.3   c-0.5-0.5-1.6-1.5-2.6-2.3c-3,3.7-6,7.4-9,11.1c1.1,0.9,2.2,1.7,3.2,2.6C45.2,35,47.9,31.1,50.6,27.3z" />
                                <path
                                    d="M23.2,41.8c0.1-0.3,8.3-9.8,12.3-14.2c0.1-0.1,0.2-0.2,0.4-0.3c0.9,0.8,1.8,1.6,2.8,2.5c-4.3,4.7-8.7,9.6-12.9,14.3   C25.2,43.6,23.5,42.2,23.2,41.8z" />
                            </svg>
                        </button>
                        <button class="tool-btn" id="btnSmartReframe" title="Reenquadramento Inteligente">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path
                                    d="M8.507 14.474a.682.682 0 1 0 .965.965l.655-.654a.682.682 0 0 0-.965-.965l-.655.654Zm5.203-4.238a.682.682 0 0 1 0-.965l.655-.654a.682.682 0 1 1 .965.965l-.655.654a.682.682 0 0 1-.965 0Zm-2.81 2.81a.682.682 0 0 1 0-.964l1.072-1.072a.682.682 0 1 1 .965.964l-1.072 1.072a.682.682 0 0 1-.965 0Z">
                                </path>
                                <path
                                    d="M17.743 9.392a.19.19 0 0 0 .361-.013 4.61 4.61 0 0 1 3.028-3.131l.15-.048a.193.193 0 0 0-.005-.37l-.064-.019a4.566 4.566 0 0 1-3.11-3.163.188.188 0 0 0-.36-.013l-.068.193a4.852 4.852 0 0 1-3.095 2.997c-.183.059-.182.319 0 .382a5.104 5.104 0 0 1 3.114 3.053l.049.132ZM7.242 5.219h5.896a4.828 4.828 0 0 0 .007 1.914H7.242v8.615c0 .528.428.957.957.957h8.614V10.85a4.816 4.816 0 0 0 1.915.033v5.822h2.688l-.516 1.914h-2.172v2.971l-1.915-.524v-2.447H8.2a2.871 2.871 0 0 1-2.871-2.871V7.133H2.584l.513-1.914h2.23V3.022l1.915-.512v2.709Z">
                                </path>
                            </svg>
                        </button>
                        <button class="tool-btn" id="btnMirror" title="Espelhar Horizontalmente">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path
                                    d="M20.036 17.954 15.349 9.05v8.905h4.687ZM15.234 4.537c-.487-.924-1.885-.578-1.885.466v12.953a2 2 0 0 0 2 2h6.343a1 1 0 0 0 .885-1.466L15.234 4.536ZM4.66 17.954 9.35 9.05v8.905H4.66ZM9.464 4.537c.486-.924 1.885-.578 1.885.466v12.952a2 2 0 0 1-2 2H3.005a1 1 0 0 1-.885-1.465L9.464 4.536Z">
                                </path>
                            </svg>
                        </button>
                    </div>

                    <div class="zoom-controls">
                        <label for="zoomSlider" class="tool-btn">
                            <svg viewBox="0 0 64 64" id="zoom" fill="currentColor" width="18" height="18">
                                <path
                                    d="M62.1,55.7L51.5,45.1c-0.9-0.8-2-1.3-3.1-1.3c-0.2,0-0.4,0-0.6,0l-5.4-5.2c0,0,0,0,0,0c-0.1-0.2,1.7-2.7,1.9-3  c2.7-4.8,3.6-9.9,2.7-15.3C44.9,7.8,33.4-0.7,20.8,1C9.3,2.5,0.6,12.5,0.6,24.8c0.1,0.7,0.1,2,0.3,3.2c2.7,16,20.5,24.5,34.6,16.5  c0.3-0.2,2.9-2,3-1.8l5.5,5.3c-0.1,1.2,0.4,2.4,1.3,3.3l10.6,10.6c1.7,1.7,4.5,1.7,6.2,0C63.8,60.2,63.8,57.5,62.1,55.7z M24.1,40.1  c-8.8,0-16-7-16-15.9c0-8.8,7.1-15.9,15.8-15.9c8.8,0,15.9,7.1,16,15.9C40,32.8,32.8,40,24.1,40.1z" />
                            </svg>
                        </label>

                        <input type="range" id="zoomSlider" name="zoom_slider" class="zoom-slider" min="5" max="2000"
                            value="100" aria-label="Ajustar zoom da timeline">

                        <button type="button" id="btnCinemaMode" name="cinema_mode" class="tool-btn"
                            title="Minimizar Timeline (Cinema Mode)">
                            <svg viewBox="0 0 24 24" width="20px" height="20px" preserveAspectRatio="xMidYMid meet"
                                fill="currentColor" class="iconpark-icon">
                                <path fill-rule="evenodd" clip-rule="evenodd"
                                    d="M18 2H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3ZM6 4h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z">
                                </path>
                                <path
                                    d="M14.914 15.57 12 18.482 9.086 15.57 7.67 16.983l3.268 3.268a1.5 1.5 0 0 0 2.121 0l3.268-3.268-1.414-1.414Z">
                                </path>
                            </svg>
                        </button>
                    </div>
                </header>

                <div class="timeline" id="timeline">
                    <div class="playhead" id="playhead"></div>

                    <div class="tracks">
                        <div class="track video-track" id="videoTrack" data-type="video">
                            <div class="track-label">
                                <div class="track-controls">
                                    <button type="button" id="btnAddTrack" name="add_track" class="btn-small">+</button>
                                </div>VÍDEO 1
                            </div>
                        </div>

                        <div class="track audio-track" id="audio-a" data-type="audio">
                            <div class="track-label">ÁUDIO A</div>
                        </div>
                        <div class="track audio-track" id="audio-b" data-type="audio">
                            <div class="track-label">ÁUDIO R</div>
                        </div>
                    </div>
        </main>
    </div>

    <!-- MODAL DE EXPORTAÇÃO PROFISSIONAL (ESTILO MEDIA ENCODER) -->
    <div id="exportModal" class="modal-overlay hidden">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title-group">
                    <h3 id="exportModalTitle">📦 Exportação Profissional</h3>
                    <span class="modal-subtitle">Motor de Renderização Estilo Media Encoder</span>
                </div>
                <button type="button" class="close-modal" id="btnCloseExportModal"
                    name="close_export_modal">&times;</button>
            </div>

            <div class="modal-body">
                <!-- 1. TELA DE CONFIGURAÇÕES -->
                <div id="exportSettingsView">
                    <p class="section-desc">Configure os parâmetros de saída antes de iniciar a exportação.</p>

                    <div class="form-group">
                        <label for="exportFileName" class="label-white">Nome do Arquivo Final:</label>
                        <input type="text" id="exportFileName" name="export_file_name" class="modal-input"
                            placeholder="meu_video_profissional" value="video_renderizado">
                    </div>

                    <div class="form-group">
                        <label for="exportFormat" class="label-white">Formato de Vídeo:</label>
                        <select id="exportFormat" name="export_format" class="modal-select">
                            <option value="mp4" selected>MP4 (H.264 / AAC)</option>
                            <option value="mov">MOV (Apple ProRes / PCM)</option>
                            <option value="mkv">MKV (Matroska / High Quality)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="exportFillMode" class="label-white">Modo de Preenchimento:</label>
                        <select id="exportFillMode" name="export_fill_mode" class="modal-select">
                            <option value="pad" selected>Barras Pretas (Preservar tudo)</option>
                            <option value="crop">Preencher Tela (Cortar bordas)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="exportQuality" class="label-white">Qualidade da Renderização:</label>
                        <select id="exportQuality" name="export_quality" class="modal-select">
                            <option value="low">Baixa (Draft/Fast)</option>
                            <option value="medium" selected>Média (Padrão Web)</option>
                            <option value="high">Alta (Alta Fidelidade)</option>
                            <option value="ultra">Ultra (Master sem perdas)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="checkbox-option" for="checkUseGPU">
                            <input type="checkbox" id="checkUseGPU" name="use_gpu" checked>
                            <div>
                                <span>Aceleração por Hardware (GPU NVENC)</span>
                                <small>Usa a placa de vídeo para exportar em alta velocidade.</small>
                            </div>
                        </label>
                    </div>

                    <div class="form-group">
                        <label class="checkbox-option" for="checkBatchExport">
                            <input type="checkbox" id="checkBatchExport" name="batch_export">
                            <div>
                                <span>Exportar clipes individuais</span>
                                <small>Gera um arquivo separado para cada corte na timeline.</small>
                            </div>
                        </label>
                    </div>

                    <div id="renderPreflightInfo" class="preflight-info">
                        <span id="renderEstSize">Tamanho Estimado: Calculando...</span>
                    </div>

                    <div class="modal-actions-full">
                        <button type="button" class="modal-btn btn-primary btn-full" id="btnStartRender">
                            🚀 Iniciar Renderização
                        </button>
                    </div>
                </div>

                <!-- 2. TELA DE PROGRESSO (ESTILO PREMIERE) -->
                <div id="exportProgressView" class="hidden">
                    <div class="render-preview-container" style="--visor-w: 600px; --visor-h: 337px;">
                        <canvas id="exportCanvasVisor" class="render-visor-canvas"></canvas>
                        <video id="exportVideoVisor" class="render-visor-video hidden" muted playsinline></video>
                        <div id="exportThumbnail" class="render-preview-image hidden">
                            <div class="render-overlay-play">⚙️</div>
                        </div>
                        <div class="render-info-overlay">
                            <p id="renderInfoText">Sequência 01 - 1080p H.264</p>
                        </div>
                    </div>

                    <div class="render-stats-panel">
                        <div class="stat-row">
                            <span class="stat-label">Decorrido:</span>
                            <span id="exportTimerElapsed" class="stat-value">00:00:00</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Restante:</span>
                            <span id="exportTimerRemaining" class="stat-value">Calculando...</span>
                        </div>
                    </div>

                    <p id="exportStatusText" class="status-main-text">Iniciando codificação...</p>

                    <div id="exportProgressContainer">
                        <div class="progress-bar-bg">
                            <div id="exportProgressBar" class="progress-bar-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-stats">
                            <span id="renderPercentage">0%</span>
                        </div>
                    </div>

                    <div class="render-details-list">
                        <div id="renderDetailRes">Resolução: 1920x1080</div>
                        <div id="renderDetailFormat">Formato: H.264 / AAC</div>
                        <div id="renderDetailPath">Destino: /assets/exports/</div>
                    </div>

                    <button type="button" class="modal-btn btn-danger btn-full" id="btnCancelRender">
                        🛑 Cancelar Exportação
                    </button>
                </div>
                <!-- 3. TELA DE SUCESSO / RESULTADO -->
                <div id="exportResultView" class="hidden">
                    <div class="success-header">
                        <div class="success-icon-bg">
                            <span class="success-icon">🎬</span>
                        </div>
                        <p id="exportResultText">Processo de Exportação Concluído!</p>
                    </div>

                    <div class="export-actions-grid">
                        <button type="button" class="modal-btn btn-primary btn-success-action" id="btnDownloadResult"
                            name="download_btn">
                            📥 Baixar Arquivo Final
                        </button>
                    </div>
                    <div class="modal-separator"><span>Salvar na Nuvem</span></div>

                    <div class="cloud-export-row">
                        <button type="button" class="cloud-btn" id="btnExportGDrive" name="export_gdrive"
                            data-cloud="gdrive" aria-label="Exportar para Google Drive">☁️ Drive</button>
                        <button type="button" class="cloud-btn" id="btnExportDropbox" name="export_dropbox"
                            data-cloud="dropbox" aria-label="Exportar para Dropbox">📦 Dropbox</button>
                        <button type="button" class="cloud-btn" id="btnExportOneDrive" name="export_onedrive"
                            data-cloud="onedrive" aria-label="Exportar para OneDrive">🔼 OneDrive</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="cameraOverlay" class="camera-overlay hidden">
        <div class="camera-box">
            <video id="cameraPreview" autoplay muted playsinline></video>
            <div class="camera-controls">
                <span class="timer" id="recordTimer">00:00</span>
                <button type="button" id="btnStopRecord" name="stop_record" class="btn-danger">⏹️ Parar
                    Gravação</button>
            </div>
        </div>
    </div>

    <!-- Configurações do Projeto (Unified) -->
    <script nonce="<?php echo $nonce; ?>">
        window.projectSettings = window.projectSettings || {
            version: "2.1.0-stable",
            lastRefined: "<?php echo date('Y-m-d H:i:s'); ?>",
            context: "Live-Cut-Editor-test-real",
            width: 1920,
            height: 1080,
            fps: 30,
            sampleRate: 44100,
            explorer: 'native'
        };
    </script>

    <script nonce="<?php echo $nonce; ?>">
        // Global project settings fallback to prevent 404 errors from external plugins/tools
        window.projectSettings = window.projectSettings || {};
    </script>

    <?php
    $configFile = 'assets/js/core/config.js';
    $configPath = __DIR__ . '/' . $configFile;
    if (file_exists($configPath)): ?>
        <script src="./<?php echo $configFile; ?>?v=<?php echo filemtime($configPath); ?>"
            nonce="<?php echo $nonce; ?>"></script>
    <?php endif; ?>

    <!-- Script com NONCE para permitir execução segura (Cache-busting ativado) -->
    <script type="module" src="./assets/js/core/editor.js?v=<?php echo time(); ?>"
        nonce="<?php echo $nonce; ?>"></script>

</body>

</html>