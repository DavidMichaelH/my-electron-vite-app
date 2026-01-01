# Electron + React + Python Template

A minimal template demonstrating communication between an Electron app with React (TypeScript) frontend and Python (FastAPI) backend.

## Architecture

```
┌─────────────────────────────────────────┐
│   Electron Desktop App                  │
│  ┌───────────────────────────────────┐  │
│  │  React Frontend (TypeScript)      │  │
│  │  - User Interface                 │  │
│  │  - Makes HTTP requests via fetch  │  │
│  └───────────────────────────────────┘  │
└───────────────┬─────────────────────────┘
                │ HTTP (fetch API)
                ↓ http://127.0.0.1:8000
        ┌───────────────────┐
        │  Python Backend   │
        │  (FastAPI)        │
        │  - Business Logic │
        │  - Data Storage   │
        └───────────────────┘
```

## Project Structure

```
my-electron-vite-app/
├── src/
│   ├── main/
│   │   └── index.ts              # Electron main process (spawns Python backend)
│   ├── preload/
│   │   └── index.ts              # Preload script (not used in this template)
│   └── renderer/
│       ├── index.html            # HTML with CSP configuration
│       └── src/
│           ├── App.tsx           # React UI component
│           └── main.tsx          # React entry point
├── backend/
│   ├── main.py                   # FastAPI backend with counter endpoints
│   └── requirements.txt          # Python dependencies
├── package.json                  # Node.js dependencies and scripts
└── electron.vite.config.ts       # Vite configuration for Electron
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+

### Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Install Python dependencies:
   ```bash
   cd backend
   pip3 install -r requirements.txt
   cd ..
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

This will:
- Start the Vite dev server for React (with HMR)
- Build and launch the Electron app
- Automatically spawn the Python backend on port 8000

### Build for Production

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

## How It Works

### 1. Electron Main Process (`src/main/index.ts`)

The main process:
- Spawns the Python backend as a child process when the app starts
- Captures Python stdout/stderr for logging
- Kills the Python process when the app closes

**Key code:**
```typescript
pythonProcess = spawn('python3', [backendPath], {
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
})
```

### 2. Python Backend (`backend/main.py`)

A simple FastAPI server that:
- Stores a counter variable in memory
- Exposes REST API endpoints for increment/reset operations
- Runs on http://127.0.0.1:8000

**Current endpoints:**
- `GET /` - Health check
- `POST /counter/increment` - Increment counter
- `POST /counter/reset` - Reset counter to 0

### 3. React Frontend (`src/renderer/src/App.tsx`)

The UI:
- Makes HTTP requests to the Python backend using `fetch()`
- Displays the counter value
- Handles loading states and errors

**Key code:**
```typescript
const response = await fetch('http://127.0.0.1:8000/counter/increment', {
  method: 'POST'
})
const data = await response.json()
setCounter(data.counter)
```

### 4. Content Security Policy (`src/renderer/index.html`)

The CSP allows connections to the local Python backend:
```html
<meta
  http-equiv="Content-Security-Policy"
  content="... connect-src 'self' http://127.0.0.1:8000 http://localhost:8000"
/>
```

## Extending This Template

### Adding New Python Endpoints

1. **Edit `backend/main.py`** to add new endpoints:

```python
@app.post("/calculate")
def calculate(data: dict):
    """Example: Add a new endpoint for calculations"""
    result = data['a'] + data['b']
    return {"result": result}
```

2. **Call from React** in `src/renderer/src/App.tsx`:

```typescript
const calculate = async (a: number, b: number) => {
  const response = await fetch('http://127.0.0.1:8000/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ a, b })
  })
  const data = await response.json()
  console.log('Result:', data.result)
}
```

### Adding Python Dependencies

1. **Add to `backend/requirements.txt`:**
```
pandas==2.0.0
numpy==1.24.0
```

2. **Install:**
```bash
cd backend
pip3 install -r requirements.txt
```

3. **Use in `backend/main.py`:**
```python
import pandas as pd

@app.post("/process_data")
def process_data(data: dict):
    df = pd.DataFrame(data['records'])
    # Process data with pandas
    return {"summary": df.describe().to_dict()}
```

### Adding React Components

1. **Create new component** in `src/renderer/src/components/`:

```typescript
// src/renderer/src/components/DataTable.tsx
export function DataTable({ data }: { data: any[] }) {
  return (
    <table>
      {data.map((row, i) => (
        <tr key={i}>
          <td>{row.name}</td>
          <td>{row.value}</td>
        </tr>
      ))}
    </table>
  )
}
```

2. **Import in App.tsx:**
```typescript
import { DataTable } from './components/DataTable'

function App() {
  const [data, setData] = useState([])

  return <DataTable data={data} />
}
```

### Adding Styles

1. **Create CSS file** in `src/renderer/src/`:
```css
/* src/renderer/src/App.css */
.button {
  padding: 1rem 2rem;
  background: #10b981;
  color: white;
  border-radius: 8px;
}
```

2. **Import in component:**
```typescript
import './App.css'
```

### Storing Persistent Data (Python Side)

**Option 1: JSON file**
```python
import json
from pathlib import Path

DATA_FILE = Path(__file__).parent / "data.json"

@app.post("/save")
def save_data(data: dict):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f)
    return {"status": "saved"}

@app.get("/load")
def load_data():
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {}
```

**Option 2: SQLite database**
```python
import sqlite3

@app.post("/add_user")
def add_user(name: str, email: str):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", (name, email))
    conn.commit()
    conn.close()
    return {"status": "added"}
```

### File Upload from React

**React side:**
```typescript
const uploadFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('http://127.0.0.1:8000/upload', {
    method: 'POST',
    body: formData
  })
  return await response.json()
}
```

**Python side:**
```python
from fastapi import File, UploadFile

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    # Process file
    return {"filename": file.filename, "size": len(contents)}
```

### Environment Variables

**Development:**
1. Create `.env` in project root:
```
API_KEY=your_api_key_here
DEBUG=true
```

2. Load in Python:
```python
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv('API_KEY')
```

### Error Handling Best Practices

**Python side:**
```python
from fastapi import HTTPException

@app.post("/process")
def process_data(data: dict):
    try:
        # Process data
        result = risky_operation(data)
        return {"result": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
```

**React side:**
```typescript
const processData = async (data: any) => {
  try {
    const response = await fetch('http://127.0.0.1:8000/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Request failed')
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to process data:', error)
    // Show user-friendly error message
  }
}
```

### Adding Background Tasks (Python)

For long-running operations:

```python
from fastapi import BackgroundTasks
import time

def process_large_file(filename: str):
    # Long-running task
    time.sleep(10)
    print(f"Finished processing {filename}")

@app.post("/process_async")
def process_async(background_tasks: BackgroundTasks, filename: str):
    background_tasks.add_task(process_large_file, filename)
    return {"status": "processing", "message": "Task started in background"}
```

### Communicating Progress to Frontend

Use polling or WebSockets:

**Polling approach (simpler):**

Python:
```python
task_status = {}

@app.get("/task_status/{task_id}")
def get_status(task_id: str):
    return task_status.get(task_id, {"status": "not_found"})
```

React:
```typescript
const pollStatus = async (taskId: string) => {
  const interval = setInterval(async () => {
    const response = await fetch(`http://127.0.0.1:8000/task_status/${taskId}`)
    const status = await response.json()

    if (status.status === 'completed') {
      clearInterval(interval)
      console.log('Task completed!')
    }
  }, 1000) // Check every second
}
```

## Common Patterns

### Loading Data on App Start

```typescript
useEffect(() => {
  const loadInitialData = async () => {
    const response = await fetch('http://127.0.0.1:8000/initial_data')
    const data = await response.json()
    setData(data)
  }

  // Wait for backend to be ready
  setTimeout(loadInitialData, 500)
}, [])
```

### Debouncing User Input

```typescript
import { useEffect, useState } from 'react'

function SearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query) {
        const response = await fetch(`http://127.0.0.1:8000/search?q=${query}`)
        const data = await response.json()
        setResults(data.results)
      }
    }, 300) // Wait 300ms after user stops typing

    return () => clearTimeout(timer)
  }, [query])

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}
```

### Sharing Types Between Frontend and Backend

**Python (generate JSON schema):**
```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str

# Generate TypeScript interfaces from Pydantic models
# Use: pip install pydantic-to-typescript
```

**TypeScript:**
```typescript
interface User {
  id: number
  name: string
  email: string
}
```

## Troubleshooting

### Backend won't start
- Check Python path: `which python3`
- Verify dependencies: `pip3 list | grep fastapi`
- Check logs in Electron dev tools console

### CSP errors
- Add domains to `connect-src` in `src/renderer/index.html`
- For external APIs, add their domains too

### Port already in use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Hot reload not working
- Check that Vite dev server is running on port 5173+
- Try hard refresh: Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows)

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-vite Documentation](https://electron-vite.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Next Steps

1. Add proper error handling and logging
2. Implement data persistence (database or file storage)
3. Add authentication if needed
4. Build production version with PyInstaller
5. Add tests for both frontend and backend
6. Create installer/DMG for distribution

## License

MIT
