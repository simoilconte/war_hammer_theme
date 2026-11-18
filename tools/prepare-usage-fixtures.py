"""Checker-only usage states. No live quota or agent data is modified."""
import json
import shutil
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "mods/imperial-status"
now = int(time.time())
cases = {
    "fresh": {"updated": now, "utc_offset_min": 60, "rate_limits": {
        "five_hour": {"used_percentage": 25, "resets_at": now + 3600},
        "seven_day": {"used_percentage": 80, "resets_at": now + 86400}}},
    "expired": {"updated": now - 86400, "utc_offset_min": 60, "rate_limits": {
        "seven_day": {"used_percentage": 95, "resets_at": now - 3600}}},
    "missing": None,
}
for name, data in cases.items():
    target = ROOT / "verification/usage-fixtures" / name
    target.mkdir(parents=True, exist_ok=True)
    source = (SOURCE / "main.js").read_text()
    encoded = json.dumps(json.dumps(data))
    source = source.replace("this.usage = null;", f"this.usage = parseUsage({encoded});")
    (target / "main.js").write_text(source)
    for file in ("mod.json", "usage.js"):
        shutil.copy2(SOURCE / file, target / file)
    print(target)
