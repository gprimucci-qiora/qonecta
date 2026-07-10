import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

BASE_URL = "https://fswweb.sistemastp.com.mx"
FFM_USER = os.environ.get("FFM_USER", "")
FFM_PASSWORD = os.environ.get("FFM_PASSWORD", "")

# True automáticamente en GitHub Actions (HEADLESS=true en el workflow)
HEADLESS = os.environ.get("HEADLESS", "false").lower() == "true"

DOWNLOADS_DIR = PROJECT_ROOT / "downloads"
OUTPUT_DIR = PROJECT_ROOT / "output"
