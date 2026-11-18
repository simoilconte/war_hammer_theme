"""Install only Imperial Command files, after a recoverable copy of Herdr configuration.
Never activates the layout or restarts Herdr/core. Refuses any existing destination.
"""
import hashlib
import argparse
import json
import shutil
import stat
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODS = ["imperial-agents", "imperial-chrome", "imperial-spaces", "imperial-status", "imperial-toast", "imperial-pane", "imperial-tabs"]


def main():
    parser = argparse.ArgumentParser(description="Install Imperial Command without overwriting existing theme files")
    parser.add_argument("--home", type=Path, default=Path.home() / ".config/herdr-app", help="Herdr configuration folder")
    app_home = parser.parse_args().home.expanduser().resolve()
    if not (app_home / "settings.json").is_file():
        raise SystemExit("Open Herdr once before installing, or pass its configuration folder with --home.")
    targets = [(ROOT / "mods" / name, app_home / "mods" / name) for name in MODS]
    targets += [(ROOT / category / filename, app_home / category / filename)
                for category, filename in [("layouts", "imperial-command.json"), ("layouts", "imperial-command.svg"), ("themes", "imperial-command.json")]]
    for source, target in targets:
        if not source.exists():
            raise SystemExit(f"Missing source: {source}")
        if target.exists():
            raise SystemExit(f"Refusing to overwrite existing file/folder: {target}")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = app_home / "backups" / f"before-imperial-command-{stamp}"

    def ignore(directory, entries):
        return [name for name in entries if name in ("backups", "telemetry")
                or stat.S_ISSOCK((Path(directory) / name).lstat().st_mode)]

    shutil.copytree(app_home, backup, ignore=ignore, symlinks=True)
    # Immutable baseline of original layouts/mods/themes and personal settings.
    originals = {}
    for category in ("layouts", "mods", "themes"):
        for file in (app_home / category).rglob("*"):
            if file.is_file():
                originals[str(file.relative_to(app_home))] = hashlib.sha256(file.read_bytes()).hexdigest()
    for name in ("keys.json", "settings.json", "programs.json"):
        file = app_home / name
        originals[name] = hashlib.sha256(file.read_bytes()).hexdigest()
    (backup / "original-sha256.json").write_text(json.dumps(originals, indent=2) + "\n")
    installed = []
    # Mod folders before the layout: nothing can switch to an incomplete layout.
    for source, target in targets:
        if source.is_dir():
            shutil.copytree(source, target, ignore=shutil.ignore_patterns("gpui-kit.d.ts", "herdr.d.ts", "jsconfig.json", "__pycache__"))
            shutil.copy2(ROOT / "LICENSE", target / "LICENSE")
        else:
            shutil.copy2(source, target)
        installed.append(str(target))
    settings_file = app_home / "settings.json"
    settings = json.loads(settings_file.read_text())
    settings.setdefault("sounds", {}).update(json.loads((ROOT / "settings.imperial-alerts.json").read_text())["sounds"])
    settings_file.write_text(json.dumps(settings, indent=2) + "\n")
    report = {"backup": str(backup), "installed": installed, "activated": False}
    (ROOT / "verification").mkdir(exist_ok=True)
    (ROOT / "verification/install.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
