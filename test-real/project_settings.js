/**
 * project_settings.js - Unified Configuration File
 * Loads project-specific settings and provides defaults.
 * Now includes previous app_settings.js logic.
 */
window.projectSettings = window.projectSettings || {};

// Merge with existing or default values
Object.assign(window.projectSettings, {
    version: "2.1.0-stable",
    lastRefined: new Date().toISOString(),
    mode: "secure-fallback",
    explorer: "native",
    // Default Fallbacks if PHP doesn't inject them
    width: window.projectSettings.width || 1920,
    height: window.projectSettings.height || 1080,
    fps: window.projectSettings.fps || 30,
    sampleRate: window.projectSettings.sampleRate || 44100
});

// Backward Compatibility
window.LIVE_CUT_PROJECT_SETTINGS = window.projectSettings;
// console.log("[Config] Project Settings loaded:", window.projectSettings);
