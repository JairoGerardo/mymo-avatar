// contextIsolation is enabled — expose only what the renderer needs via contextBridge.
// The avatar SDK runs entirely in the renderer process (browser context), so no
// bridge is required for it. Add IPC bridges here for any native features you need.
