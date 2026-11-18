// Adapted from Middle-earth fellowship-toast, MIT. In-app notifications only.
import { View, div, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, theme, shared, run, closeOverlay } from "herdr";
const CAST_KEY = "imperial-command.cast.v1";
const CHAPTERS = ["ultramarines", "blood-angels", "dark-angels", "imperial-fists", "raven-guard", "white-scars", "salamanders", "space-wolves"];

export function imperialToast(raw, cast) {
  const event = /^(.+) (finished|needs you)$/.exec(raw.title ?? "");
  const address = raw.action?.name === "agent.focus" ? raw.action.args?.terminal : null;
  const chapter = CHAPTERS.find(id => id === cast?.[address]);
  if (!event || !chapter) return raw;
  const done = event[2] === "finished";
  return { ...raw,
    chapter,
    title: `${chapter.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")} — ${done ? "Mission complete" : "Orders required"}`,
    body: [event[1], address, raw.body].filter(Boolean).join(" · "),
    icon: `mods/imperial-agents/sprites/${chapter}-${done ? "done" : "blocked"}.svg`,
  };
}

export default class ImperialToast extends View {
  render() {
    const t = theme(), raw = props() ?? {}, p = imperialToast(raw, shared(CAST_KEY));
    const login = /^([a-z0-9][a-z0-9_.-]{0,31}) needs login; run hc machine login \1$/.exec(p.body ?? "");
    const command = login ? `hc machine login ${login[1]}` : null;
    return h_flex().id("imperial-toast").size_full().px(14).gap(10).items_center().bg(t.popover)
      .border_l(3).border_color(p.level === "warning" || p.level === "error" ? t.blocked : t.accent)
      .cursor_pointer().hover(el => el.bg(t.hover))
      .on_click(() => { if (p.action?.name) run(p.action.name, p.action.args ?? {}); closeOverlay(p.overlay); })
      .child(p.chapter ? div().relative().w(46).h(46).overflow_hidden().flex_none()
        .child(image("mods/imperial-agents/art/marines-atlas.png").absolute().w(368).h(184)
          .left(-CHAPTERS.indexOf(p.chapter) * 46).top(p.title.includes("Mission complete") ? -138 : -92))
        : p.icon ? image(p.icon).w(32).h(32).flex_none() : div().size(8).flex_none().bg(t.accent))
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(div().truncate().font_semibold().text_size(12).text_color(t.foreground).child(login ? `${login[1]} needs a login: run` : p.title ?? ""))
        .when(!login && Boolean(p.body), el => el.child(div().truncate().text_size(11).text_color(t.muted).child(p.body)))
        .when(Boolean(login), el => el.child(h_flex().gap(8).items_center()
          .child(div().flex_1().min_w(0).truncate().tooltip(command).text_size(11).text_color(t.muted).child(command))
          .child(div().id("imperial-login-copy").px(5).py(3).text_size(11).text_color(t.accent).cursor_pointer()
            .on_click((_e, cx) => { cx.stop_propagation(); cx.write_to_clipboard(command); this.copied = true; cx.notify(); }).child(this.copied ? "Copied" : "Copy")))));
  }
}
