# Live Cut Editor - File Structure

Complete directory tree and file organization for the project.

## Root Directory (`test-real/`)

```
test-real/
├── editor.php                 # Main application entry point
├── project_settings.js        # Unified project configuration
├── README.md                  # Project documentation
├── FILE_STRUCTURE.md          # This file
│
├── api/                       # Backend PHP Scripts
│   ├── db.php                 # Database connection (PDO)
│   ├── upload.php             # File upload handler
│   ├── export.php             # Video export/rendering
│   └── cleanup_session.php    # Session-based file cleanup
│
├── uploads/                   # Temporary user uploads
│   └── (auto-cleaned on session end)
│
├── exports/                   # Rendered video output
│   └── (auto-deleted after 30 minutes)
│
└── assets/                    # Frontend Resources
    ├── css/
    │   ├── editor.css         # Main application styles
    │   ├── timeline.css       # Timeline-specific styles (GPU accelerated)
    │   └── modal.css          # Modal dialogs
    │
    ├── js/
    │   └── core/
    │       ├── editor.js      # Main editor logic & initialization
    │       ├── state.js       # State management
    │       ├── history.js     # Undo/redo system
    │       └── modules/
    │           ├── audio.js           # Audio buffer management
    │           ├── timeline.js        # Timeline rendering
    │           ├── export.js          # Export modal & logic
    │           ├── uploader.js        # File upload UI
    │           ├── recorder.js        # Audio/video recording
    │           └── file-operations.js # File system operations
    │
    └── img/
        └── cloud/
            ├── dropbox.svg    # Cloud service icons
            ├── gdrive.svg
            └── onedrive.svg
```

## Key Files Explained

### Core Application

#### `editor.php`
- Main HTML structure
- CSP nonce generation
- Inline configuration injection
- Module loading with cache-busting

#### `project_settings.js`
- Unified configuration (merged from app_settings.js)
- Project dimensions (1920x1080)
- FPS and sample rate defaults
- Backward compatibility aliases

### API Layer

#### `api/db.php`
- PDO database connection
- MySQL configuration
- Error handling
- Prepared statement setup

#### `api/upload.php`
- File validation (mp4, webm, mp3, wav, etc.)
- Unique filename generation
- Session tracking for cleanup
- Error handling with JSON responses

#### `api/export.php`
- FFmpeg command generation
- GPU acceleration detection (NVENC)
- Quality preset mapping
- 30-minute garbage collection
- Complex filter graph construction

#### `api/cleanup_session.php`
- Session-based file deletion
- Beacon API endpoint
- Old file purge (2+ hours)
- Security path validation

### Frontend Core

#### `assets/js/core/editor.js`
- Application initialization
- Audio pool management (12 elements)
- Playback loop with RAF
- Drift correction (playbackRate)
- Ghost Buster (stray element cleanup)
- Event listeners setup

#### `assets/js/core/modules/timeline.js`
- Canvas-based rendering
- Ruler generation
- Clip visualization
- Waveform drawing
- GPU-accelerated transforms

#### `assets/js/core/modules/audio.js`
- AudioContext management
- Buffer decoding with concurrency control
- Waveform data extraction
- Audio unlocking on user interaction

#### `assets/js/core/modules/export.js`
- Export modal UI
- Quality settings
- Batch export
- File System Access API integration
- Cloud upload preparation

### Styling

#### `assets/css/timeline.css`
- GPU acceleration properties (`will-change`, `translateZ`)
- Clip styling
- Playhead animation
- Track layout

#### `assets/css/editor.css`
- Dark theme variables
- Layout grid
- Modal styles
- Responsive design

## Architecture Patterns

### Audio Pool System
- **Pre-allocated elements**: 12 `<audio>` tags created on init
- **LRU eviction**: Least recently used nodes recycled
- **Zero allocation**: No runtime element creation
- **Drift correction**: Smooth playback rate adjustments

### State Management
- **Centralized state**: Single `window.state` object
- **History tracking**: Undo/redo with action stack
- **Persistence**: LocalStorage auto-save
- **Immutability**: State changes trigger re-render

### CSP Compliance
- **No inline scripts**: All JS in external files
- **Nonce-based**: Dynamic scripts use PHP-generated nonces
- **No eval()**: String-to-code conversion avoided
- **Strict policies**: `script-src 'self' 'nonce-...'`

### Performance Optimizations
- **RAF-based rendering**: 60fps target
- **Throttled updates**: Debounced state saves
- **Canvas caching**: Pre-rendered rulers
- **GPU offloading**: CSS transforms for timeline

## File Lifecycle

### Upload Flow
1. User selects file → `uploader.js`
2. POST to `api/upload.php`
3. File saved to `uploads/` with unique name
4. Path stored in `$_SESSION['temp_uploads']`
5. On tab close → Beacon to `api/cleanup_session.php`
6. Files deleted from disk

### Export Flow
1. User clicks export → `export.js`
2. POST to `api/export.php` with timeline data
3. FFmpeg processes clips
4. Output saved to `exports/`
5. After 30 minutes → Auto-deleted by next export request

## Security Considerations

- **Session validation**: All uploads tied to PHP session
- **Path sanitization**: `realpath()` checks prevent directory traversal
- **Type validation**: Whitelist of allowed file extensions
- **Size limits**: PHP `upload_max_filesize` enforced
- **Auto-cleanup**: Prevents disk exhaustion attacks
