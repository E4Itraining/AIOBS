#!/usr/bin/env python3
"""
AIOBS Visualization Platform - Runner
Launch the FastAPI server for the visualization dashboard
"""
import uvicorn


def main():
    """Run the AIOBS visualization server"""
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     █████╗ ██╗ ██████╗ ██████╗ ███████╗                  ║
    ║    ██╔══██╗██║██╔═══██╗██╔══██╗██╔════╝                  ║
    ║    ███████║██║██║   ██║██████╔╝███████╗                  ║
    ║    ██╔══██║██║██║   ██║██╔══██╗╚════██║                  ║
    ║    ██║  ██║██║╚██████╔╝██████╔╝███████║                  ║
    ║    ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═════╝ ╚══════╝                  ║
    ║                                                           ║
    ║         AI Observability Hub - Visualization              ║
    ║         Trust Control Layer for AI Systems                ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    print("Starting AIOBS Visualization Server...")
    print("Dashboard: http://localhost:8000")
    print("API Docs:  http://localhost:8000/api/docs")
    print("-" * 50)

    uvicorn.run(
        "visualization.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()
