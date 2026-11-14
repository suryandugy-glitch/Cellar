"""One-click launcher: opens the Cellar dashboard. No install needed."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cellar.cli import main  # noqa: E402

sys.exit(main(["ui", "--config", str(Path(__file__).resolve().parent / "cellar.json")] + sys.argv[1:]))
