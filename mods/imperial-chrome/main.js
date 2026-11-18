import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, run, window, layout, shared, setShared, props } from "herdr";

function sidebar(node) {
  if (node?.id === "sidebar") return node;
  for (const child of node?.children ?? []) { const found = sidebar(child); if (found) return found; }
}
const narrow = () => (sidebar(layout())?.size?.px ?? 350) < 160;
function toggleSidebar() {
  const width = sidebar(layout())?.size?.px ?? 350;
  if (!narrow()) setShared("imperial-command.sidebar-width", width);
  run("layout.resize", { id: "sidebar", px: narrow() ? shared("imperial-command.sidebar-width") ?? 350 : 76 });
}

export default class ImperialChrome extends View {
  button(id, icon, hint, action) {
    const t = theme();
    return div().id(id).size(24).flex_none().flex().items_center().justify_center()
      .text_color(t.muted).hover(el => el.bg(t.hover).text_color(t.accent)).tooltip(hint)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action)
      .child(svg(`mods/workspace-chrome/${icon}.svg`).size(13));
  }
  render() {
    const t = theme(), rail = narrow(), w = window();
    const ornament = name => "mods/imperial-chrome/ornaments/" + name + ".svg";
    const corners = el => el.children(["tl", "tr", "bl", "br"].map(pos => image(ornament("corner-" + pos)).absolute().w(20).h(20)
      .when(pos[0] === "t", x => x.top(0)).when(pos[0] === "b", x => x.bottom(0))
      .when(pos[1] === "l", x => x.left(0)).when(pos[1] === "r", x => x.right(0))));
    if (props()?.footer) {
      const control = (id, label, action) => div().id(id).px(7).py(4).text_size(10).text_color(t.accent).cursor_pointer()
        .hover(el => el.bg(t.hover)).on_click(action).child(label);
      return v_flex().size_full().bg(t.chrome).border_t(1).border_color(t.accent)
        .when(!rail, el => el.child(image(ornament("shrine")).w_full().h(66).flex_none()))
        .child(h_flex().flex_1().min_h(25).items_center().justify_between().px(6)
          .child(control("imperial-settings", rail ? "⚙" : "⚙ Settings", () => run("app.settings")))
          .child(control("imperial-machine", rail ? "+" : "+ Add machine", () => run("mod.open", { name: "machine-add" }))));
    }
    return v_flex().size_full().bg(t.chrome)
      .child(h_flex().h(28).flex_none().pl(w?.platform === "macos" && !w?.fullscreen ? 78 : 10).pr(6).gap(3).items_center()
        .when(!rail, el => el.child(image(ornament("mission")).w(15).h(15))
          .child(div().flex_1().text_size(12).text_color(t.accent).child("Herdr"))
          .child(this.button("imperial-search", "search", "Find a Space", () => run("mod.open", { name: "picker" })))
          .child(this.button("imperial-layout", "layers", "Switch layout", () => run("layout.switch")))
          .child(this.button("imperial-sidebar", "sidebar", "Collapse sidebar", toggleSidebar))))
      .when(!rail, el => el.child(corners(v_flex().relative().mx(4).flex_1().min_h(0).border(1).border_color(t.border).items_center().justify_center().py(4)
        .child(image(ornament("aquila")).w(150).h(50).flex_none())
        .child(corners(v_flex().relative().w(230).h(66).flex_none().border(1).border_color(t.border).bg("#080C13").items_center().justify_center()
          .child(div().h(28).font_family("TeX Gyre Pagella").text_size(26).font_bold().text_color("#F0C365").child("IMPERIAL"))
          .child(div().h(28).font_family("TeX Gyre Pagella").text_size(26).font_bold().text_color("#F0C365").child("COMMAND")))))))
      .when(rail, el => el.child(div().id("imperial-rail-expand").h(38).text_center().text_color(t.accent).cursor_pointer().on_click(toggleSidebar).child("IC »")));
  }
}
