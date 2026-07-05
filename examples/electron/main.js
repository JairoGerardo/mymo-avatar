const { app, BrowserWindow } = require("electron")

const path = require("path")

const DEV_URL = "http://localhost:5173"
const isDev   = process.env.NODE_ENV !== "production"

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  })

  if (isDev) {
    win.loadURL(DEV_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, "dist/renderer/index.html"))
  }
}

app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
