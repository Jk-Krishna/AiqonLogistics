import uvicorn

if __name__ == "__main__":
    print("=" * 65)
    print("  🚀 Starting Aiqon Logistics Decision Engine & Web Server")
    print("  🌐 Access UI & Optimizer at: http://localhost:8000")
    print("  📑 API Docs available at:     http://localhost:8000/docs")
    print("=" * 65)
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=False)

