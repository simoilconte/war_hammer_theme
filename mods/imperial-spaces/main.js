// Keep navigation and menus in Herdr. This list never polls projects or invokes programs.
import { View, div, image } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle } from "gpui-base";
import { spaces, panes, machines, theme, run, openOverlay, layout } from "herdr";

function sidebar(node) {
  if (node?.id === "sidebar") return node;
  for (const child of node?.children ?? []) { const found = sidebar(child); if (found) return found; }
}
const narrow = () => (sidebar(layout())?.size?.px ?? 350) < 160;
function projectDetail(space, ps) {
  const tabs = new Set((space.tabs ?? []).map(t => t.id));
  const folder = ps.find(p => tabs.has(p.tab) && p.cwd)?.cwd || space.folder || "";
  const base = folder.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
  return [base.toLowerCase() !== space.name.toLowerCase() ? base : "", space.machine].filter(Boolean).join(" · ");
}

export default class ImperialSpaces extends View {
  init() { this.scroll = ScrollHandle.new(); this.pressed = null; this.over = null; }
  render() {
    const t = theme(), rail = narrow(), list = spaces(), ps = panes();
    const active = list.findIndex(s => s.active);
    const activeId = list[active]?.id;
    if (activeId !== this.activeId && active >= 0) { this.scroll.scroll_to_item(active); this.activeId = activeId; }
    return v_flex().size_full().min_h(0).mx(4).my(3).bg(t.chrome).border(1).border_color(t.border)
      .child(h_flex().h(27).px(10).flex_none().gap(6).items_center().border_b(1).border_color(t.border)
        .child(div().flex_1().font_family("TeX Gyre Pagella").text_size(15).text_color(t.accent).font_bold().child(rail ? "OPS" : "+  SPACES"))
        .child(div().id("imperial-space-new").w(20).h(24).text_center().cursor_pointer().text_color(t.accent).tooltip("New Space")
          .hover(el => el.bg(t.hover)).on_click(() => run("space.new")).child("+")))
      .child(v_flex().id("imperial-space-list").flex_1().min_h(0).px(rail ? 4 : 8).overflow_y_scrollbar().track_scroll(this.scroll)
        .children(list.map((s, i) => {
          const detail = projectDetail(s, ps);
          return h_flex().id(`imperial-space-${s.id}`).relative().h(28).px(7).gap(8).items_center().flex_none()
            .border(1).border_color(s.active ? "#AA3036" : "#00000000").rounded(2)
            .when(s.active, el => el.bg(t.selected)).hover(el => el.bg(t.hover)).cursor_pointer()
            .tooltip([s.name, detail, s.branch, s.machine && machines().find(m => m.name === s.machine)?.layout].filter(Boolean).join(" · "))
            .when(this.pressed && this.over === s.id && this.pressed !== s.id, el => el.child(div().absolute().bottom(0).left(0).right(0).h(2).bg(t.accent)))
            .on_mouse_down("left", () => { this.pressed = s.id; this.over = s.id; })
            .on_mouse_move((_e, cx) => {
              const source = list.find(x => x.id === this.pressed);
              const over = source && source.machine === s.machine ? s.id : null;
              if (this.pressed && this.over !== over) { this.over = over; cx.notify(); }
            })
            .on_mouse_up("left", (_e, cx) => {
              if (this.pressed && this.over === s.id && this.pressed !== s.id) run("space.move", { id: this.pressed, index: i + 1 });
              else if (this.pressed === s.id) run("space.select", { id: s.id });
              this.pressed = null; this.over = null; cx.notify();
            })
            .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 220, height: 280, props: { tab: "space", target: { id: s.id } } }))
            .child(image("mods/imperial-chrome/ornaments/mission.svg").w(18).h(18).flex_none())
            .when(!rail, el => el.child(div().flex_1().min_w(0).truncate().font_family("TeX Gyre Pagella").font_bold().text_size(14).text_color(t.foreground).child(s.name.toUpperCase()))
              .when(Boolean(detail), el => el.child(div().max_w(110).truncate().text_size(10).text_color(t.dim).child(detail))))
            .when(s.status === "blocked" || s.status === "done", el => el.child(div().text_size(11).font_bold().text_color(t[s.status]).child(s.status === "blocked" ? "!" : "◆")));
        }))
        .on_mouse_up("left", (_e, cx) => { if (this.pressed) { this.pressed = null; this.over = null; cx.notify(); } }));
  }
}
