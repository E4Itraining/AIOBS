#!/usr/bin/env python3
"""
AIOBS Visualization Platform - Runner
Launch the FastAPI server for the visualization dashboard
"""
import sys
import os

# Ensure stdout/stderr are flushed immediately for debugging
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None
sys.stderr.reconfigure(line_buffering=True) if hasattr(sys.stderr, 'reconfigure') else None

print("[DEBUG] run.py starting...", flush=True)

# Add the parent directory to Python path so 'visualization' module can be found
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(f"[DEBUG] Parent dir: {parent_dir}", flush=True)
print(f"[DEBUG] __name__ = {__name__}", flush=True)

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
    print(f"[DEBUG] Added {parent_dir} to sys.path", flush=True)


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
    print("[DEBUG] main() called", flush=True)
    # Check dependencies first
    check_dependencies()
    print("[DEBUG] Dependencies check passed", flush=True)

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
        reload_dirs=["visualization"],
        log_level="info"
    )


print(f"[DEBUG] About to check __name__ (currently: {__name__})", flush=True)

if __name__ == "__main__":
    print("[DEBUG] __name__ == '__main__', calling main()", flush=True)
    try:
        main()
    except Exception as e:
        print(f"[ERROR] Exception in main(): {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)
else:
    print(f"[DEBUG] __name__ != '__main__', not calling main()", flush=True)
