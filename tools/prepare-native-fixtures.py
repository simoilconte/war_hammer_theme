"""Prepare checker-only fixtures. Never creates terminals or installs test mods."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "verification/native-fixtures"
chapter_ids = ["ultramarines", "blood-angels", "dark-angels", "imperial-fists", "raven-guard", "white-scars", "salamanders", "space-wolves"]
states = ["working", "idle", "blocked", "done"]
roster = []
projects = []
cast = {}
for state in states:
    project = {"id": f"fixture-{state}", "name": f"Fixture {state}", "folder": "/fixture/Project", "tabs": []}
    for i, chapter in enumerate(chapter_ids):
        address = f"fixture-{state}-{chapter}"
        tab = f"fixture-tab-{state}-{i}"
        project["tabs"].append({"id": tab, "name": f"Mission {i+1}", "named": True})
        roster.append({"address": address, "space": project["id"], "status": state, "pane": f"pane-{address}", "tab": tab,
                       "program": {"name": "Fixture agent"}, "focused": False, "pinned": i == 0})
        cast[address] = chapter
    projects.append(project)
sub = {"address": "fixture-sub", "parent": roster[0]["address"], "state": "live", "status": "blocked", "program": {"name": "Sub-agent"}}
cast[sub["address"]] = "ultramarines"
all_terminals = [{"address": a["address"], "state": "live"} for a in roster] + [sub]
source = (ROOT / "mods/imperial-agents/main.js").read_text()
source = source.replace("groupAgents(agents(), terminals(), spaces())", f"groupAgents({json.dumps(roster)}, {json.dumps(all_terminals)}, {json.dumps(projects)})")
source = source.replace("const stored = shared(CAST_KEY);", f"const stored = {json.dumps(cast)};")
for variant in ("all-states", "rail", "folded", "compact"):
    folder = OUT / variant
    folder.mkdir(parents=True, exist_ok=True)
    text = source
    if variant == "rail":
        text = text.replace("rail = narrow()", "rail = true")
    if variant == "compact":
        text = text.replace('const dense = Boolean(shared("imperial-command.dense"));', 'const dense = true;')
    if variant == "folded":
        text = text.replace("const folded = { ...record(shared(FOLD_KEY)) };", f"const folded = {json.dumps({p['id']: True for p in projects})};")
    (folder / "main.js").write_text(text)
    for name in ("model.js", "ui.js", "mod.json"):
        shutil.copy2(ROOT / "mods/imperial-agents" / name, folder / name)
    print(folder)
