from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import signal

app = FastAPI()

# Allow requests from Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory counter
counter = 0

@app.get("/")
def read_root():
    return {"message": "Python backend is running!"}

@app.get("/counter")
def get_counter():
    """Get the current counter value"""
    return {"counter": counter}

@app.post("/counter/increment")
def increment_counter():
    """Increment the counter by 1"""
    global counter
    counter += 1
    return {"counter": counter, "message": f"Counter incremented to {counter}"}

@app.post("/counter/reset")
def reset_counter():
    """Reset the counter to 0"""
    global counter
    counter = 0
    return {"counter": counter, "message": "Counter reset to 0"}

@app.post("/shutdown")
def shutdown():
    """Gracefully shutdown the server

    This endpoint allows the Electron app to request a clean shutdown
    before forcefully killing the process.
    """
    def shutdown_server():
        # Give time for response to be sent
        import time
        time.sleep(0.1)
        # Exit cleanly
        os._exit(0)

    # Run shutdown in background to allow response to be sent
    import threading
    threading.Thread(target=shutdown_server, daemon=True).start()

    return {"message": "Server shutting down"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
