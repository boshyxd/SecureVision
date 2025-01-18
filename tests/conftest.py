import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.insert(0, project_root)

def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers",
        "asyncio: mark test as async"
    ) 