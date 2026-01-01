import { useState } from 'react'

function App(): React.JSX.Element {
  const [counter, setCounter] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const incrementCounter = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('http://127.0.0.1:8000/counter/increment', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setCounter(data.counter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to increment counter')
      console.error('Error incrementing counter:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetCounter = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('http://127.0.0.1:8000/counter/reset', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setCounter(data.counter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset counter')
      console.error('Error resetting counter:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Python Counter Demo</h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '2rem' }}>
        Electron + React + Python (FastAPI)
      </p>

      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        textAlign: 'center',
        minWidth: '400px'
      }}>
        <div style={{
          fontSize: '5rem',
          fontWeight: 'bold',
          color: '#667eea',
          marginBottom: '2rem'
        }}>
          {counter}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={incrementCounter}
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: 'white',
              background: loading ? '#9ca3af' : '#10b981',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {loading ? 'Loading...' : 'Increment'}
          </button>

          <button
            onClick={resetCounter}
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: 'white',
              background: loading ? '#9ca3af' : '#ef4444',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Reset
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f3f4f6',
          borderRadius: '8px',
          color: '#374151',
          fontSize: '0.9rem'
        }}>
          <strong>How it works:</strong><br/>
          React (frontend) → HTTP → Python FastAPI (backend)<br/>
          Counter value stored in Python memory
        </div>
      </div>
    </div>
  )
}

export default App
