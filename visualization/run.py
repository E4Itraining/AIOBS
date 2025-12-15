#!/usr/bin/env python3
"""
AIOBS Visualization Platform - Runner
Launch the FastAPI server for the visualization dashboard
"""
import sys


def check_dependencies():
    """Check for required dependencies and provide helpful error messages."""
    missing = []

    try:
        import uvicorn
    except ImportError:
        missing.append("uvicorn")

    try:
        import fastapi
    except ImportError:
        missing.append("fastapi")

    try:
        import pydantic
    except ImportError:
        missing.append("pydantic")

    if missing:
        print("\n" + "=" * 60, file=sys.stderr)
        print("ERROR: Missing required dependencies!", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(f"\nThe following packages are required but not installed:", file=sys.stderr)
        for pkg in missing:
            print(f"  - {pkg}", file=sys.stderr)
        print(f"\nTo install them, run:", file=sys.stderr)
        print(f"  pip install {' '.join(missing)}", file=sys.stderr)
        print(f"\nOr install all dependencies:", file=sys.stderr)
        print(f"  pip install -r requirements.txt", file=sys.stderr)
        print("=" * 60 + "\n", file=sys.stderr)
        sys.exit(1)

    return True


def main():
    """Run the AIOBS visualization server"""
    # Check dependencies first
    check_dependencies()

    import uvicorn

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
