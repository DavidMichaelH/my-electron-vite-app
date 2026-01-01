import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

let pythonProcess: any = null
const BACKEND_PORT = 8000
const MAX_RETRIES = 3

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
    // Open DevTools for debugging
    if (is.dev) {
      mainWindow.webContents.openDevTools()
    }
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

// Check if port is in use and kill the process using it
async function ensurePortAvailable(port: number): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // Windows: Use netstat to find and kill process
      const { stdout } = await execPromise(`netstat -ano | findstr :${port}`)
      const lines = stdout.trim().split('\n')
      const pids = new Set<string>()

      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/)
        if (match) {
          pids.add(match[1])
        }
      }

      for (const pid of pids) {
        console.log(`[Port ${port}]: Killing process ${pid}`)
        await execPromise(`taskkill //F //PID ${pid}`).catch(() => {
          // Ignore errors if process already died
        })
      }

      // Wait a bit for port to be released
      await new Promise((resolve) => setTimeout(resolve, 500))
    } else {
      // macOS/Linux: Use lsof to find and kill process
      try {
        const { stdout } = await execPromise(`lsof -ti:${port}`)
        const pids = stdout.trim().split('\n').filter(Boolean)

        for (const pid of pids) {
          console.log(`[Port ${port}]: Killing process ${pid}`)
          await execPromise(`kill -9 ${pid}`).catch(() => {
            // Ignore errors if process already died
          })
        }

        // Wait a bit for port to be released
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch {
        // No process found on port - this is fine
      }
    }
  } catch (error) {
    // Port is likely free, which is what we want
    console.log(`[Port ${port}]: Port appears to be free`)
  }
}

// Start Python backend with retry logic
async function startPythonBackend(): Promise<void> {
  // First, ensure port is available
  console.log(`[Backend]: Ensuring port ${BACKEND_PORT} is available...`)
  await ensurePortAvailable(BACKEND_PORT)

  return startPythonBackendAttempt(0)
}

function startPythonBackendAttempt(attempt: number): Promise<void> {
  return new Promise((resolve, reject) => {
  // In dev mode: __dirname is /path/to/my-electron-vite-app/out/main
  // In production: __dirname is inside the .app bundle

    let backendExecutable: string
    let args: string[] = []

    if (is.dev) {
      // Development: Run Python script directly
      // Use 'python' on Windows, 'python3' on macOS/Linux
      backendExecutable = process.platform === 'win32' ? 'python' : 'python3'
      args = [join(__dirname, '../../backend/main.py')]
    } else {
      // Production: Run PyInstaller executable
      const extension = process.platform === 'win32' ? '.exe' : ''
      backendExecutable = join(process.resourcesPath, 'backend', `backend${extension}`)
      args = [] // PyInstaller executable doesn't need arguments
    }

    console.log(`[Backend]: Starting Python backend (attempt ${attempt + 1}/${MAX_RETRIES})`)
    console.log('[Backend]: Executable:', backendExecutable)
    console.log('[Backend]: Arguments:', args)

    pythonProcess = spawn(backendExecutable, args, {
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    let backendStarted = false
    let errorOutput = ''

    pythonProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log(`[Python stdout]: ${output}`)

      // Check if backend started successfully
      if (output.includes('Uvicorn running on')) {
        backendStarted = true
        console.log('[Backend]: ✓ Backend started successfully!')
        resolve()
      }
    })

    pythonProcess.stderr.on('data', (data: Buffer) => {
      const output = data.toString()
      console.error(`[Python stderr]: ${output}`)
      errorOutput += output

      // Check if backend started successfully (uvicorn logs to stderr)
      if (output.includes('Uvicorn running on')) {
        backendStarted = true
        console.log('[Backend]: ✓ Backend started successfully!')
        resolve()
      }

      // Check for port binding error
      if (output.includes('error while attempting to bind') || output.includes('Address already in use')) {
        console.error('[Backend]: Port binding error detected')
      }
    })

    pythonProcess.on('error', (err: Error) => {
      console.error(`[Backend ERROR]: Failed to start Python process:`, err)
      if (!backendStarted) {
        reject(err)
      }
    })

    pythonProcess.on('close', (code: number) => {
      console.log(`[Backend]: Process exited with code ${code}`)

      if (!backendStarted && code !== 0) {
        // Backend failed to start
        if (attempt < MAX_RETRIES - 1) {
          console.log(`[Backend]: Retrying in 2 seconds...`)
          setTimeout(async () => {
            try {
              // Clean up port again before retry
              await ensurePortAvailable(BACKEND_PORT)
              await startPythonBackendAttempt(attempt + 1)
              resolve()
            } catch (err) {
              reject(err)
            }
          }, 2000)
        } else {
          reject(new Error(`Backend failed to start after ${MAX_RETRIES} attempts`))
        }
      }
    })

    // Timeout after 10 seconds if we don't see the "Uvicorn running" message
    setTimeout(() => {
      if (!backendStarted) {
        console.error('[Backend]: Startup timeout - backend did not start within 10 seconds')
        if (attempt < MAX_RETRIES - 1) {
          pythonProcess?.kill()
        }
      }
    }, 10000)
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
