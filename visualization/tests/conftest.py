"""
Pytest Configuration for AIOBS Tests
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))


def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "security: marks security-related tests")
    config.addinivalue_line("markers", "injection: marks injection detection tests")
    config.addinivalue_line("markers", "drift: marks drift detection tests")


def pytest_collection_modifyitems(config, items):
    """Modify test collection based on markers"""
    # Add security marker to injection tests automatically
    for item in items:
        if "injection" in item.nodeid.lower():
            item.add_marker(pytest.mark.security)
            item.add_marker(pytest.mark.injection)


@pytest.fixture(scope="session")
def test_report_dir():
    """Create and return test report directory"""
    report_dir = os.path.join(os.path.dirname(__file__), "..", "..", "test-reports")
    os.makedirs(report_dir, exist_ok=True)
    return report_dir
