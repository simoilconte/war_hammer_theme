import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { layout, run, shared, setShared } from "herdr";
import { CHAPTERS, STATES, LABELS } from "./model.js";

export function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) { const found = find(child, id); if (found) return found; }
  return null;
}
export const narrow = () => (find(layout(), "sidebar")?.size?.px ?? 350) < 160;
export function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px ?? 350;
  if (!narrow()) setShared("imperial-command.sidebar-width", width);
  run("layout.resize", { id: "sidebar", px: narrow() ? shared("imperial-command.sidebar-width") ?? 350 : 76 });
}
export function marine(chapter, status, size = 72, key = chapter) {
  const col = Math.max(0, CHAPTERS.findIndex(c => c.id === chapter));
  const row = { idle: 0, working: 1, blocked: 2, done: 3 }[status] ?? 0;
  // One shared GPU texture. Clip cells natively; never edit the original atlas.
  const pose = div().id(`imperial-marine-pose-${key}`).relative().w(size).h(size)
    .left(0).top(status === "done" ? -2 : 0).transition("top", { duration: 240, easing: "ease-out" })
    .when(status === "idle", el => el.loop("top", { from: 0, to: 1, period: 3200 }))
    .when(status === "working", el => el.loop("left", { from: 0, to: -1, period: 900 }))
    .child(div().relative().w(size).h(size).overflow_hidden()
      .child(image("mods/imperial-agents/art/marines-atlas.png").absolute()
        .left(-col * size).top(-row * size).w(size * 8).h(size * 4)));
  return div().relative().w(size).h(size).flex_none().child(pose)
    .when(status === "blocked", el => el.child(div().absolute().top(3).right(2).px(3).bg("#251606").border(1).border_color("#FFC24A")
      .text_color("#FFC24A").text_size(12).font_bold().child("!").loop("opacity", { from: .55, to: 1, period: 1800 })));
}
export function corners(el, positions = ["tl", "tr", "bl", "br"], size = 18) {
  return el.children(positions.map(pos => image(`mods/imperial-chrome/ornaments/corner-${pos}.svg`).absolute().w(size).h(size)
    .when(pos[0] === "t", x => x.top(0)).when(pos[0] === "b", x => x.bottom(0))
    .when(pos[1] === "l", x => x.left(0)).when(pos[1] === "r", x => x.right(0))));
}
export function badges(t, counts, compact = true) {
  const symbols = { blocked: "!", working: "W", done: "D", idle: "I" };
  return h_flex().flex_none().items_center().gap(5)
    .children(STATES.filter(s => counts[s] > 0).map(s => div()
      .px(4).py(1).text_size(9.5).font_medium().text_color(t[s] ?? t.dim)
      .when(s === "blocked", el => el.bg(t.blocked + "22").border(1).border_color(t.blocked))
      .tooltip(`${counts[s]} ${LABELS[s]}`).child(`${counts[s]} ${compact ? symbols[s] : LABELS[s]}`)));
}
