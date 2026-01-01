import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'

let pythonProcess: any = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Start Python backend
function startPythonBackend(): void {
  // In dev mode: __dirname is /path/to/my-electron-vite-app/out/main
  // In production: __dirname is inside the .app bundle

  let backendExecutable: string
  let args: string[] = []

  if (is.dev) {
    // Development: Run Python script directly
    backendExecutable = 'python3'
    args = [join(__dirname, '../../backend/main.py')]
  } else {
    // Production: Run PyInstaller executable
    const extension = process.platform === 'win32' ? '.exe' : ''
    backendExecutable = join(process.resourcesPath, 'backend', `backend${extension}`)
    args = [] // PyInstaller executable doesn't need arguments
  }

  console.log('Starting Python backend from:', backendExecutable)
  console.log('Arguments:', args)
  console.log('__dirname:', __dirname)
  console.log('process.resourcesPath:', process.resourcesPath)

  pythonProcess = spawn(backendExecutable, args, {
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  })

  pythonProcess.stdout.on('data', (data: Buffer) => {
    console.log(`Python: ${data.toString()}`)
  })

  pythonProcess.stderr.on('data', (data: Buffer) => {
    console.log(`Python: ${data.toString()}`)
  })

  pythonProcess.on('close', (code: number) => {
    console.log(`Python process exited with code ${code}`)
  })
}

// Stop Python backend
function stopPythonBackend(): void {
  if (pythonProcess) {
    pythonProcess.kill()
    pythonProcess = null
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Start Python backend
  startPythonBackend()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  stopPythonBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up when quitting
app.on('quit', () => {
  stopPythonBackend()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
