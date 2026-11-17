import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print("=" * 65)
    print("  🚀 Starting Shipment Analysis Web Server & Optimizer")
    print(f"  🌐 Access UI & Optimizer at: http://0.0.0.0:{port}")
    print(f"  📑 API Docs available at:     http://0.0.0.0:{port}/docs")
    print("=" * 65)
    uvicorn.run("backend.app:app", host="0.0.0.0", port=port, reload=False)

