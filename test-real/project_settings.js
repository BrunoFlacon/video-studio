/**
 * project_settings.js - Local fallback for external tools
 * This file is here to prevent 404 errors in the browser console.
 * The application configuration is managed by config.js and editor.php.
 */
window.projectSettings = window.projectSettings || {
    version: "2.1.0-stable",
    width: 1920,
    height: 1080,
    fps: 30,
    sampleRate: 44100
};
