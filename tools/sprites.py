"""Original 32px Astartes grid sprites. Writes only this project's own assets.

Uses the same crisp SVG grid approach as Middle-earth (MIT), with original art.
No dependencies. No network, system configuration or live Herdr writes.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAPTERS = [
    ("ultramarines", "#315B9C", "#203866", "#648CC4", "#D9AE51", "#F47664"),
    ("blood-angels", "#BE4140", "#70292F", "#E66B5B", "#D9AE51", "#81E0AE"),
    ("dark-angels", "#255345", "#16342E", "#4B8270", "#D7CFAB", "#F47664"),
    ("imperial-fists", "#E9BC38", "#99772C", "#FFE38A", "#242B39", "#F47664"),
    ("raven-guard", "#242B36", "#141A22", "#626E81", "#D9E0E4", "#F47664"),
    ("white-scars", "#DFE5E5", "#8C9DA9", "#FFFFFF", "#BE4140", "#79D3CB"),
    ("salamanders", "#61A345", "#355C31", "#93C962", "#252C30", "#F18B46"),
    ("space-wolves", "#8DA9BD", "#526E8E", "#C1D8E1", "#E9BC38", "#F47664"),
]


def grid():
    return [["."] * 32 for _ in range(32)]


def rect(g, x, y, w, h, key):
    assert x >= 0 and y >= 0 and x + w <= 32 and y + h <= 32
    for row in g[y:y + h]:
        row[x:x + w] = [key] * w


def stamp(g, x, y, rows, key="T"):
    for dy, row in enumerate(rows):
        for dx, char in enumerate(row):
            if char != ".":
                g[y + dy][x + dx] = key


def marine(chapter, pose, second=False):
    g = grid()
    # Reinforced backpack, exhaust stacks, broad pauldrons and Mark VII helmet.
    rect(g, 7, 9, 18, 14, "O")
    rect(g, 6, 7, 4, 10, "S"); rect(g, 22, 7, 4, 10, "S")
    rect(g, 6, 7, 4, 2, "M"); rect(g, 22, 7, 4, 2, "M")
    rect(g, 11, 3, 10, 10, "O"); rect(g, 12, 2, 8, 1, "O")
    rect(g, 12, 3, 8, 8, "A"); rect(g, 13, 3, 5, 2, "H")
    rect(g, 12, 6, 8, 3, "S")
    rect(g, 12, 7, 3, 1, "V"); rect(g, 17, 7, 3, 1, "V")
    if pose == "idle" and second:
        rect(g, 12, 7, 3, 1, "H"); rect(g, 17, 7, 3, 1, "H")
    rect(g, 15, 7, 2, 4, "M"); rect(g, 13, 10, 6, 2, "S")
    rect(g, 14, 10, 1, 2, "M"); rect(g, 17, 10, 1, 2, "M")
    rect(g, 4, 12, 24, 7, "O"); rect(g, 5, 12, 8, 6, "T"); rect(g, 19, 12, 8, 6, "T")
    rect(g, 6, 13, 6, 5, "A"); rect(g, 20, 13, 6, 5, "A")
    rect(g, 6, 13, 6, 1, "H"); rect(g, 20, 13, 6, 1, "H")
    rect(g, 12, 13, 8, 10, "A"); rect(g, 13, 13, 6, 1, "H")
    # Chest aquila, skull belt, segmented greaves, oversized power-armour boots.
    stamp(g, 13, 15, ["TT..TT", ".TTTT.", "..TT.."])
    rect(g, 12, 22, 8, 2, "S"); rect(g, 15, 22, 2, 2, "T")
    rect(g, 10, 24, 5, 5, "O"); rect(g, 17, 24, 5, 5, "O")
    rect(g, 11, 24, 4, 4, "A"); rect(g, 17, 24, 4, 4, "A")
    rect(g, 11, 24, 4, 1, "H"); rect(g, 17, 24, 4, 1, "H")
    rect(g, 9, 28, 7, 3, "O"); rect(g, 17, 28, 7, 3, "O")
    rect(g, 10, 28, 5, 2, "S"); rect(g, 18, 28, 5, 2, "S")
    rect(g, 10, 28, 5, 1, "A"); rect(g, 18, 28, 5, 1, "A")
    # Each chapter carries its own distinct six-pixel heraldic mark.
    marks = {
        "ultramarines": ["X..X", "X..X", "X..X", ".XX."],
        "blood-angels": [".XX.", "XXXX", ".XX.", "..X."],
        "dark-angels": [".X..", ".X..", "XXX.", ".X.."],
        "imperial-fists": [".XX.", "XXXX", "XXXX", ".XX."],
        "raven-guard": ["X..X", "XXXX", ".XX.", "..X."],
        "white-scars": ["..X.", ".XX.", "XX..", ".X.."],
        "salamanders": [".XX.", "XXXX", "X.X.", ".XX."],
        "space-wolves": ["X..X", "XXXX", "X.XX", ".XX."],
    }
    stamp(g, 7, 14, marks[chapter], "T")
    # Gauntlets and bolter. Idle holds low; working raises/recoils the weapon.
    rect(g, 5, 19, 6, 5, "S"); rect(g, 21, 19, 6, 5, "S")
    rect(g, 6, 19, 4, 3, "A"); rect(g, 22, 19, 4, 3, "A")
    gun_y = 18 if pose == "working" else 21
    gun_x = 12 if second and pose == "working" else 13
    rect(g, gun_x, gun_y, 15, 4, "O"); rect(g, gun_x + 1, gun_y, 10, 2, "M")
    rect(g, gun_x + 2, gun_y + 1, 6, 2, "G"); rect(g, gun_x + 5, gun_y + 3, 3, 3, "O")
    rect(g, gun_x + 11, gun_y + 1, 4, 2, "M"); rect(g, gun_x + 2, gun_y + 3, 3, 2, "S")
    rect(g, gun_x + 1, gun_y + 2, 2, 1, "T")
    if pose == "working" and second:
        stamp(g, 28, 17, [".F..", "FF..", ".FFF", "FF..", ".F.."], "F")
    if pose == "blocked":
        stamp(g, 1, 2, ["XXX", "XXX", "XXX", ".X.", "...", ".X."], "!")
    if pose == "done":
        # Raised fist, laurel-like completion seal. A static final pose, no looping victory.
        rect(g, 23, 4, 5, 5, "O"); rect(g, 24, 4, 3, 4, "T")
        rect(g, 24, 9, 3, 4, "A")
        stamp(g, 1, 2, [".XX..", "X..X.", "X..X.", ".XX..", "..X.."], "K")
    return g


def svg(g, palette):
    assert len(g) == 32 and all(len(row) == 32 for row in g)
    cells = []
    for y, row in enumerate(g):
        x = 0
        while x < 32:
            key = row[x]; end = x + 1
            while end < 32 and row[end] == key:
                end += 1
            if key != ".":
                cells.append(f'<rect x="{x}" y="{y}" width="{end-x}" height="1" fill="{palette[key]}"/>')
            x = end
    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">' + "".join(cells) + '</svg>\n'


def main():
    folder = ROOT / "mods/imperial-agents/sprites"
    folder.mkdir(parents=True, exist_ok=True)
    for chapter, armor, shadow, highlight, trim, visor in CHAPTERS:
        palette = {"O": "#080B10", "A": armor, "S": shadow, "H": highlight, "T": trim, "V": visor,
                   "M": "#8B98A5", "G": "#343D4B", "F": "#E5BD6A", "!": "#F08072", "K": "#D9AE51"}
        for pose in ("working", "idle", "blocked", "done"):
            (folder / f"{chapter}-{pose}.svg").write_text(svg(marine(chapter, pose), palette))
            if pose in ("working", "idle"):
                (folder / f"{chapter}-{pose}-2.svg").write_text(svg(marine(chapter, pose, True), palette))
    print("Generated 48 original crisp SVG sprites (8 chapters, 4 states).")


if __name__ == "__main__":
    main()
