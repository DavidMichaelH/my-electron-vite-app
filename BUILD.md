# Building Standalone Executables

This guide explains how to build standalone executables (DMG for macOS, EXE for Windows) that bundle the Python backend and can run without requiring Python to be installed on the user's machine.

## Overview

The build process involves two main steps:

1. **Build Python Backend** - Use PyInstaller to convert the Python FastAPI app into a standalone executable
2. **Package Electron App** - Use electron-builder to create a distributable package (.dmg, .exe) that includes the backend

## Prerequisites

### For All Platforms

- Node.js 18+
- Python 3.8+
- PyInstaller (included in requirements.txt)

Install Python dependencies:
```bash
cd backend
pip3 install -r requirements.txt
cd ..
```

### Platform-Specific Requirements

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Windows:**
- Visual Studio Build Tools or Visual Studio with C++ support

## Quick Build

### macOS

```bash
./build_standalone.sh
```

Output:
- `dist/mac-arm64/my-electron-vite-app.app` (for Apple Silicon)
- `dist/mac/my-electron-vite-app.app` (for Intel)
- `dist/my-electron-vite-app-1.0.0.dmg`

### Windows

```cmd
build_standalone.bat
```

Output:
- `dist/win-unpacked/my-electron-vite-app.exe`
- `dist/my-electron-vite-app-1.0.0-setup.exe` (installer)

## Manual Build Steps

If you prefer to build manually or need to troubleshoot:

### Step 1: Build Python Backend

```bash
cd backend
pyinstaller backend.spec
cd ..
```

This creates:
- **macOS**: `backend/dist/backend` (executable)
- **Windows**: `backend/dist/backend.exe`

The executable is self-contained and includes:
- Python interpreter
- FastAPI and Uvicorn
- All Python dependencies
- Your application code

**Verify the build:**
```bash
# macOS
ls -lh backend/dist/backend

# Windows
dir backend\dist\backend.exe
```

The file should be 50-80MB.

**Test the backend directly:**
```bash
# macOS
./backend/dist/backend

# Windows
backend\dist\backend.exe
```

You should see:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 2: Build Electron App

**macOS:**
```bash
npm run build:mac
```

**Windows:**
```bash
npm run build:win
```

**Linux:**
```bash
npm run build:linux
```

This will:
1. Build the React frontend with Vite
2. Build the Electron main process
3. Copy the Python backend executable from `backend/dist` to the app resources
4. Create platform-specific installers

## Build Configuration

### PyInstaller Configuration (`backend/backend.spec`)

Key settings:

```python
a = Analysis(
    ['main.py'],  # Entry point
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        # ... other uvicorn modules
    ],
    # ...
)

exe = EXE(
    # ...
    name='backend',  # Output name
    console=True,    # Set to False to hide console window
    # ...
)
```

**To hide the console window** (for production):
1. Edit `backend/backend.spec`
2. Change `console=True` to `console=False`
3. Rebuild: `pyinstaller backend.spec`

### Electron Builder Configuration (`electron-builder.yml`)

Key settings:

```yaml
extraResources:
  - from: backend/dist      # Source: PyInstaller output
    to: backend             # Destination in app.asar.unpacked
    filter:
      - '**/*'
```

This copies the backend executable into the app bundle's resources directory.

### Main Process Configuration (`src/main/index.ts`)

The main process automatically detects dev vs production:

```typescript
if (is.dev) {
  // Development: Run Python script with python3
  backendExecutable = 'python3'
  args = [join(__dirname, '../../backend/main.py')]
} else {
  // Production: Run PyInstaller executable
  backendExecutable = join(process.resourcesPath, 'backend', 'backend')
}
```

## Customizing the Build

### Change App Name

Edit `electron-builder.yml`:
```yaml
appId: com.mycompany.myapp
productName: My App Name
```

And `package.json`:
```json
{
  "name": "my-app-name",
  "version": "1.0.0",
  "description": "My application description"
}
```

### Change App Icon

1. Create icon files:
   - **macOS**: `build/icon.icns` (1024x1024)
   - **Windows**: `build/icon.ico` (256x256)
   - **Linux**: `build/icon.png` (512x512)

2. Rebuild the app

### Code Signing (macOS)

To distribute outside the App Store:

1. Get an Apple Developer certificate
2. Edit `electron-builder.yml`:
```yaml
mac:
  identity: "Developer ID Application: Your Name (XXXXXXXXXX)"
  notarize: true
```

3. Set environment variables:
```bash
export APPLE_ID="your@apple.id"
export APPLE_ID_PASSWORD="app-specific-password"
```

4. Build: `npm run build:mac`

### Windows Code Signing

1. Get a code signing certificate
2. Edit `electron-builder.yml`:
```yaml
win:
  certificateFile: path/to/cert.pfx
  certificatePassword: ${env.CERT_PASSWORD}
```

3. Build: `npm run build:win`

## Build Output Locations

### macOS

```
dist/
├── mac-arm64/
│   └── my-electron-vite-app.app          # ARM64 application
├── mac/
│   └── my-electron-vite-app.app          # x64 application
└── my-electron-vite-app-1.0.0.dmg        # DMG installer
```

**App Contents:**
```
my-electron-vite-app.app/
└── Contents/
    ├── MacOS/
    │   └── my-electron-vite-app          # Electron executable
    └── Resources/
        ├── app.asar                      # Packed app code
        └── backend/
            └── backend                    # Python backend executable
```

### Windows

```
dist/
├── win-unpacked/
│   ├── my-electron-vite-app.exe          # Main executable
│   └── resources/
│       └── backend/
│           └── backend.exe                # Python backend executable
└── my-electron-vite-app-1.0.0-setup.exe  # NSIS installer
```

### Linux

```
dist/
├── my-electron-vite-app-1.0.0.AppImage   # AppImage (portable)
├── my-electron-vite-app-1.0.0.snap       # Snap package
└── my-electron-vite-app_1.0.0_amd64.deb  # Debian package
```

## Troubleshooting

### Backend not included in app

**Problem:** App runs but Python backend doesn't start

**Solution:**
1. Check that `backend/dist/backend` exists
2. Verify `electron-builder.yml` has `extraResources` configured
3. Rebuild with `npm run build:mac`

### Backend fails to start in production

**Problem:** Backend works in dev but not in packaged app

**Diagnosis:**
1. Open the app
2. Press Cmd+Opt+I (macOS) or F12 (Windows) to open DevTools
3. Check Console for error messages

**Common fixes:**
- Missing Python dependencies: Add to `hiddenimports` in `backend.spec`
- File permissions: Ensure backend executable has execute permissions
- Path issues: Check logged paths in console

### Large file size

**Problem:** App is >150MB

**Solutions:**
1. Remove unused Python packages from `requirements.txt`
2. Edit `backend.spec` and add to `excludes`:
```python
excludes=['tkinter', 'matplotlib', 'scipy', 'numpy']  # If not used
```
3. Enable UPX compression in `backend.spec`:
```python
upx=True
```

### PyInstaller fails on import

**Problem:** `ModuleNotFoundError` when running backend executable

**Solution:**
Add missing module to `hiddenimports` in `backend.spec`:
```python
hiddenimports=[
    'uvicorn.logging',
    # ... existing imports
    'your.missing.module',  # Add here
],
```

Then rebuild: `cd backend && pyinstaller backend.spec`

### Backend console window appears (Windows)

**Problem:** Black console window appears behind the app

**Solution:**
1. Edit `backend/backend.spec`
2. Change `console=True` to `console=False`
3. Rebuild: `cd backend && pyinstaller backend.spec && cd .. && npm run build:win`

### App crashes on launch

**Diagnosis:**
1. Try running the standalone backend first:
   ```bash
   ./backend/dist/backend
   ```
2. Check if port 8000 is available:
   ```bash
   lsof -ti:8000  # macOS/Linux
   netstat -ano | findstr :8000  # Windows
   ```

## Testing the Built App

### Before Distribution

1. **Test on clean machine** without Python installed
2. **Test all features**:
   - Counter increment
   - Counter reset
   - Error handling
3. **Check logs** (Help → Open Logs Folder)
4. **Test first-launch experience** on macOS (security prompts)

### macOS Security Prompts

On first launch, users may see:
- "App can't be opened because it is from an unidentified developer"

**Solution for users:**
1. Right-click the app
2. Select "Open"
3. Click "Open" in the dialog

**Solution for developers:** Code sign the app (see Code Signing section above)

## Distribution

### macOS

**Option 1: DMG** (Recommended)
- Share `dist/my-electron-vite-app-1.0.0.dmg`
- Users drag to Applications folder

**Option 2: ZIP**
- Create ZIP of `.app` bundle
- Users extract and move to Applications

### Windows

**Option 1: Installer** (Recommended)
- Share `dist/my-electron-vite-app-1.0.0-setup.exe`
- Users run installer

**Option 2: Portable**
- ZIP the `dist/win-unpacked` folder
- Users extract and run .exe

### Linux

- **AppImage**: Portable, no installation needed
- **Snap**: Universal Linux package
- **DEB**: For Debian/Ubuntu systems

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Build

on: [push]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          npm install
          cd backend && pip install -r requirements.txt && cd ..

      - name: Build
        run: |
          cd backend && pyinstaller backend.spec && cd ..
          npm run build:${{ matrix.os == 'macos-latest' && 'mac' || matrix.os == 'windows-latest' && 'win' || 'linux' }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/
```

## Next Steps

1. Test the built app on a clean machine
2. Set up code signing for distribution
3. Create auto-update mechanism (see [electron-updater](https://www.electron.build/auto-update))
4. Add telemetry/crash reporting
5. Create installation instructions for users

## Resources

- [PyInstaller Documentation](https://pyinstaller.org/)
- [electron-builder Documentation](https://www.electron.build/)
- [Electron Forge vs electron-builder](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [macOS Code Signing Guide](https://www.electron.build/code-signing)
