#!/usr/bin/env python3
"""
AIOBS Visualization Platform - Runner
Launch the FastAPI server for the visualization dashboard
"""

import logging
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("aiobs.runner")

# Add the parent directory to Python path so 'visualization' module can be found
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)


def check_dependencies() -> bool:
    """Check for required dependencies and provide helpful error messages."""
    missing = []

    try:
        import uvicorn  # noqa: F401
    except ImportError:
        missing.append("uvicorn")

    try:
        import fastapi  # noqa: F401
    except ImportError:
        missing.append("fastapi")

    try:
        import pydantic  # noqa: F401
    except ImportError:
        missing.append("pydantic")

    if missing:
        logger.error("=" * 60)
        logger.error("Missing required dependencies!")
        logger.error("=" * 60)
        logger.error("The following packages are required but not installed:")
        for pkg in missing:
            logger.error(f"  - {pkg}")
        logger.error("To install them, run:")
        logger.error(f"  pip install {' '.join(missing)}")
        logger.error("Or install all dependencies:")
        logger.error("  pip install -r requirements.txt")
        logger.error("=" * 60)
        return False

    return True


def main() -> None:
    """Run the AIOBS visualization server"""
    # Check dependencies first
    if not check_dependencies():
        sys.exit(1)

    import uvicorn

    from visualization.config import get_settings, validate_production_settings

    print(
        """
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
    """
    )

    # Load and validate configuration
    settings = get_settings()
    settings.log_config()

    # Check for production issues
    issues = validate_production_settings()
    for issue in issues:
        if issue.startswith("CRITICAL"):
            logger.error(issue)
        else:
            logger.warning(issue)

    logger.info("Starting AIOBS Visualization Server...")
    logger.info(f"Dashboard: http://localhost:{settings.server.port}")
    logger.info(f"API Docs:  http://localhost:{settings.server.port}/api/docs")

    uvicorn.run(
        "visualization.app:app",
        host=settings.server.host,
        port=settings.server.port,
        reload=settings.server.reload,
        reload_dirs=["visualization"] if settings.server.reload else None,
        log_level=settings.server.log_level,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)
