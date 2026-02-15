# Live Cut Editor

A professional web-based video editor for creating and editing video clips directly in the browser with real-time preview and timeline-based editing.

## 🚀 Key Features

### Core Editing
- **Timeline-based editing** with drag-and-drop support
- **Multi-track audio/video** management
- **Real-time preview** with synchronized playback
- **Waveform visualization** for audio tracks
- **Frame-accurate editing** with drift correction

### Performance Optimizations
- **GPU-accelerated rendering** for smooth 60fps playback
- **Audio object pooling** for zero-allocation performance
- **Intelligent caching** with pre-loading system
- **Concurrency control** for audio decoding

### Auto-Cleanup System
- **Session-based cleanup**: Uploads deleted on tab close
- **30-minute garbage collection**: Exports auto-deleted
- **File System Access API**: Choose save location (Chrome/Edge)

### Export & Sharing
- **Hardware-accelerated encoding** (NVENC/CPU fallback)
- **Multiple quality presets** (Low/Medium/High/Ultra)
- **Cloud integration ready** (Google Drive, Dropbox, OneDrive)
- **Batch export support**

## 📁 Project Structure

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for detailed directory layout.

### Quick Overview
- **`editor.php`**: Main application entry point
- **`api/`**: Backend PHP scripts (upload, export, cleanup)
- **`assets/`**: Frontend resources (CSS, JS, images)
- **`uploads/`**: Temporary user media storage
- **`exports/`**: Rendered video output

## 🛠️ Setup

### Requirements
- PHP 8.0+ server (WAMP, XAMPP, or similar)
- MySQL database
- FFmpeg (for video export)
- Modern browser (Chrome/Edge recommended)

### Installation
1. Clone the repository
2. Configure database in `api/db.php`
3. Ensure `uploads/` and `exports/` directories are writable
4. Access via `http://localhost/Live-Cut-Editor/test-real/editor.php`

## 🔒 Security

- **CSP Compliant**: All code follows Content Security Policy standards
- **No inline scripts**: Nonces used for dynamic content
- **Session-based auth**: Secure file handling
- **Auto-cleanup**: Prevents disk space abuse

## 🎯 Technical Highlights

- **Vanilla JavaScript**: No framework dependencies
- **Module-based architecture**: Clean separation of concerns
- **Web Audio API**: Professional-grade audio processing
- **Canvas rendering**: Optimized timeline visualization
- **PDO prepared statements**: SQL injection protection

## 📝 Recent Updates (v2.1.0)

- Fixed audio duplication with nuclear mute strategy
- Implemented aggressive cleanup for orphaned elements
- Added File System Access API for save picker
- Enhanced playbackRate drift correction
- Unified configuration files
- Improved CSP compliance throughout

## 📄 License

See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please ensure all code maintains CSP compliance and follows the existing architecture patterns.

