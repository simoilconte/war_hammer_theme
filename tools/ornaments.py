"""Create native vector ornaments for the gothic Imperial Command revision."""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "mods/imperial-chrome/ornaments"
OUT.mkdir(parents=True, exist_ok=True)
DEFS = '<defs><linearGradient id="gold" x2=".3" y2="1"><stop stop-color="#fff0ac"/><stop offset=".3" stop-color="#eec35d"/><stop offset=".58" stop-color="#8f5c23"/><stop offset=".8" stop-color="#d6a64a"/><stop offset="1" stop-color="#73501e"/></linearGradient><linearGradient id="iron" x2="0" y2="1"><stop stop-color="#454743"/><stop offset=".5" stop-color="#141b22"/><stop offset="1" stop-color="#060a10"/></linearGradient></defs>'


def save(name, w, h, body):
    (OUT / f"{name}.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{DEFS}{body}</svg>\n')


skull = '<path d="M10 3L20 2L28 6L31 13L30 22L26 26L25 33L13 33L11 26L7 22L6 13Z" fill="url(#gold)" stroke="#68481c"/><path d="M10 12L17 13L17 19L11 19L9 16ZM21 13L28 12L29 16L27 19L21 19Z" fill="#080b10"/><path d="M18 19L21 19L23 24L17 24Z" fill="#17120c"/><path d="M12 8Q20 3 27 8M11 11L16 12M22 12L27 11" fill="none" stroke="#ffec9a"/><path d="M13 26H25M16 27V32M20 26V33M24 27V32" stroke="#463117"/><path d="M13 25H25" stroke="#ffde82"/>'
save("skull", 38, 38, skull)

wing = []
for i in range(7):
    y, x = 8 + i * 6, 6 + i * 9
    wing.append(f'<path d="M{x} {y}L91 {y+5}L93 {y+10}L{x+10} {y+6}Z" fill="url(#gold)" stroke="#6c461a" stroke-width=".7"/>')
wing = "".join(wing)
save("aquila", 220, 78, wing + f'<g transform="translate(220 0) scale(-1 1)">{wing}</g>' + '<path d="M92 20L110 15L128 20L124 49L110 63L96 49Z" fill="url(#gold)" stroke="#6c461a"/><g transform="translate(91 16) scale(1 1.06)">' + skull + '</g><path d="M98 17L97 10L105 5L109 9L110 18M122 17L123 10L115 5L111 9L110 18" fill="url(#gold)" stroke="#775322"/><path d="M98 9L91 10L97 14M122 9L129 10L123 14" fill="#e9b74d"/><path d="M102 56L95 67L103 65L110 74L117 65L125 67L118 56" fill="url(#gold)" stroke="#69451b"/>')

corner = '<path d="M1 23V1H23M4 18V4H18" fill="none" stroke="#563b1f" stroke-width="2"/><path d="M2 21V2H21M5 15V5H15" fill="none" stroke="#d6aa55"/><path d="M3 3L9 3L9 5L6 6L5 9L3 9Z" fill="url(#gold)"/><path d="M11 2L16 6L11 9L10 6M2 11L6 16L9 11L6 10" fill="none" stroke="#b78c43"/><path d="M4 4L7 7M18 1H23M1 18V23" stroke="#ffdd86"/><circle cx="3" cy="3" r="1.4" fill="#ffebac"/>'
for name, transform in (("tl", ""), ("tr", "translate(24 0) scale(-1 1)"), ("bl", "translate(0 24) scale(1 -1)"), ("br", "translate(24 24) scale(-1 -1)")):
    save(f"corner-{name}", 24, 24, f'<g transform="{transform}">{corner}</g>')

save("section", 350, 44, '<rect x="1" y="1" width="348" height="42" rx="3" fill="#0a1018" stroke="#a47c3b"/><path d="M4 4H346V40H4Z" fill="none" stroke="#44351f"/><path d="M47 6H303M47 37H303" stroke="#e2b658"/><g transform="translate(8 3)">' + skull + '</g><g transform="translate(303 3)">' + skull + '</g><path d="M1 1L8 6M349 1L342 6M1 43L8 38M349 43L342 38" stroke="#ffda77"/>')

footer = ['<rect x="1" y="1" width="348" height="80" fill="#080c13" stroke="#795a2c"/>']
for x in (5, 75, 265, 335):
    footer.append(f'<rect x="{x}" y="2" width="10" height="76" fill="url(#iron)" stroke="#8b723b"/><circle cx="{x+5}" cy="9" r="2" fill="#d3ad66"/><circle cx="{x+5}" cy="70" r="2" fill="#d3ad66"/>')
footer.append('<path d="M111 79V32Q175 -20 239 32V79H227V39Q175 -2 123 39V79Z" fill="url(#gold)" stroke="#504021"/><path d="M128 78V39Q175 3 222 39V78Z" fill="#10131a" stroke="#76592e"/>')
footer.append('<g transform="translate(152 35) scale(1.2)">' + skull + '</g>')
for x in (91, 249):
    footer.append(f'<path d="M{x-8} 20H{x+9}V68L{x} 63L{x-8} 68Z" fill="#c2a575" stroke="#705129"/><path d="M{x-4} 23V55M{x+4} 23V55" stroke="#5d421d"/><circle cx="{x}" cy="20" r="10" fill="#9e1421" stroke="#e64444"/><circle cx="{x}" cy="20" r="6" fill="none" stroke="#e1554b"/><path d="M{x-3} 16L{x+3} 24M{x+3} 16L{x-3} 24" stroke="#3b0b13"/>')
for center in (41, 306):
    for delta, height in ((-12, 13), (0, 24), (12, 17)):
        x, y = center + delta, 76 - height
        footer.append(f'<rect x="{x-3}" y="{y}" width="6" height="{height}" fill="#eac678" stroke="#836031"/><path d="M{x-2} {y-2}Q{x-5} {y-7} {x} {y-13}Q{x+6} {y-5} {x+2} {y-2}Z" fill="#f4a72b"/><path d="M{x-1} {y-3}Q{x-3} {y-7} {x} {y-9}L{x+1} {y-3}Z" fill="#fff2ac"/>')
save("shrine", 350, 82, "".join(footer))
save("mission", 20, 20, '<path d="M4 2H15L17 4V18H4Z" fill="url(#gold)" stroke="#6c4a20"/><path d="M6 5H14M6 8H14M6 11H12M6 14H13" stroke="#3b2c18"/><path d="M2 3H5V16H2Z" fill="#ae7d34"/><circle cx="14" cy="14" r="3" fill="#9e2531" stroke="#e6b45b"/>')
print(f"Wrote {len(list(OUT.glob('*.svg')))} gothic SVG ornaments")
