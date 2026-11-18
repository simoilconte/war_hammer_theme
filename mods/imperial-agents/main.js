import { View, div, image } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle } from "gpui-base";
import { agents, terminals, spaces, panes, focused, theme, run, shared, setShared, setAgentOrder, checking, nextCommand } from "herdr";
import { CHAPTERS, CAST_KEY, FOLD_KEY, LABELS, record, assignChapters, groupAgents, counts, projectDetail, sessionName, taskName } from "./model.js";
import { narrow, toggleSidebar, marine, badges, corners } from "./ui.js";

export default class ImperialAgents extends View {
  init(_props, cx) {
    this.scroll = ScrollHandle.new();
    this.handle = cx.focus_handle();
    this.lastFocused = null;
    if (checking()) return;
    cx.spawn(async cx => {
      for (;;) {
        const command = await nextCommand();
        if (command === "focus") this.handle.focus();
        cx.notify();
      }
    });
    // Only elapsed state observations need a clock. Agent/Space data are event-driven.
    cx.timer.every(60000, cx => { if (Object.values(record(shared("imperial-command.observed.v1"))).some(s => s.since)) cx.notify(); });
  }

  fold(id) {
    const folded = record(shared(FOLD_KEY));
    setShared(FOLD_KEY, { ...folded, [id]: !folded[id] });
  }

  row(a, g, cast, t, rail, now, observed, dense, last) {
    const chapter = CHAPTERS.find(c => c.id === cast[a.address]) ?? CHAPTERS[0];
    const task = taskName(a, g.space);
    const name = sessionName(a);
    const active = a.focused || focused()?.terminal === a.address;
    const state = (LABELS[a.status] ?? LABELS.unknown).toUpperCase();
    const since = observed[a.address]?.since;
    const mins = since ? Math.max(0, Math.floor((now - since) / 60000)) : null;
    const duration = mins == null ? "" : mins < 1 ? "<1m" : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`;
    const tooltip = [chapter.name, `${name} · ${a.address}`, g.name, task, state, duration ? `Stato osservato da ${duration}` : ""].filter(Boolean).join("\n");
    const info = v_flex().flex_1().min_w(0).gap(5)
      .child(h_flex().min_w(0).gap(5).items_center()
        .child(div().flex_1().min_w(0).truncate().text_size(12).font_medium().text_color(t.foreground).child(`${a.depth ? "↳ " : ""}${task || name}`)))
      .child(h_flex().min_w(0).gap(5).items_center()
        .child(div().min_w(0).flex_1().truncate().font_family("TeX Gyre Pagella").text_size(13).text_color(t.accent).child(chapter.name))
        .when(Boolean(duration), el => el.child(div().flex_none().text_size(9).text_color(t.dim).tooltip("Tempo dall'ultimo cambio di stato osservato; non durata del task").child(duration))));
    const pin = div().id(`imperial-pin-${a.address}`).w(15).flex_none().text_size(11)
      .text_color(a.pinned ? t.accent : t.dim).tooltip(a.pinned ? "Unpin" : "Pin within project")
      .hover(el => el.text_color(t.foreground))
      .on_click((_e, cx) => { cx.stop_propagation(); run("terminal.pin", { terminal: a.address, pinned: !a.pinned }); })
      .child(a.pinned ? "◆" : "·");
    return corners(h_flex().id(`imperial-agent-${a.address}`).relative().h(rail ? 44 : dense ? 56 : 78).flex_none()
      .pl(rail ? 3 : 5 + Math.min(a.depth, 3) * 10).pr(8).gap(5).items_center()
      .border_l(1).border_r(1).border_b(1).border_color(t.border)
      .when(active, el => el.bg("#20141A")).hover(el => el.bg(t.hover)).cursor_pointer().tooltip(tooltip)
      .on_click(() => a.pane ? run("agent.focus", { terminal: a.address }) : run("terminal.peek", { terminal: a.address }))
      .child(marine(chapter.id, a.status, rail ? 38 : dense ? 50 : 72, a.address))
      .when(!rail, el => el.child(info)
        .child(v_flex().flex_none().gap(5).items_end()
          .child(div().font_family("Geist Mono").text_size(9).text_color(t[a.status] ?? t.dim).child(`${a.status === "unknown" ? "·" : "●"} ${state}`))
          .child(h_flex().gap(3).items_center().child(div().text_size(9).text_color(t.dim).child(a.address)).child(pin))))
      .when(rail && a.status === "blocked", el => el.child(div().text_color(t.blocked).font_bold().child("!"))),
      last && !rail ? ["bl", "br"] : [], 13);
  }

  render() {
    const t = theme(), rail = narrow();
    const dense = Boolean(shared("imperial-command.dense"));
    const groups = groupAgents(agents(), terminals(), spaces());
    const members = groups.flatMap(g => g.members);
    const totals = counts(members);
    if (JSON.stringify(totals) !== JSON.stringify(shared("imperial-command.counts.v1"))) setShared("imperial-command.counts.v1", totals);
    const stored = shared(CAST_KEY);
    const cast = assignChapters(stored, members);
    if (JSON.stringify(cast) !== JSON.stringify(stored ?? {})) setShared(CAST_KEY, cast);
    const folded = { ...record(shared(FOLD_KEY)) };
    const active = members.find(a => a.focused || focused()?.terminal === a.address)?.address;
    // Keyboard/command navigation can enter a folded project: reveal the selected row.
    if (active && active !== this.lastFocused) {
      const group = groups.find(g => g.members.some(a => a.address === active));
      if (group && folded[group.id]) { folded[group.id] = false; setShared(FOLD_KEY, folded); }
    }
    const focusChanged = active !== this.lastFocused;
    this.lastFocused = active;
    setAgentOrder(members.filter(a => a.pane).map(a => a.address));
    const now = Date.now();
    const old = record(shared("imperial-command.observed.v1"));
    const observed = { ...old };
    for (const a of members) {
      if (!observed[a.address]) observed[a.address] = { status: a.status, since: null };
      else if (observed[a.address].status !== a.status) observed[a.address] = { status: a.status, since: now };
    }
    if (JSON.stringify(observed) !== JSON.stringify(old)) setShared("imperial-command.observed.v1", observed);
    const ps = panes();
    const rows = [];
    let selectedIndex = -1;
    for (const g of groups) {
      const closed = Boolean(folded[g.id]);
      const detail = projectDetail(g.space, ps);
      rows.push(corners(v_flex().id(`imperial-project-${g.id}`).relative().flex_none().px(10).py(6).gap(3).mt(6)
        .border(1).border_color(t.accent).bg("#0D1119").cursor_pointer().hover(el => el.bg(t.hover))
        .tooltip(`${g.name}${detail ? " — " + detail : ""}\n${closed ? "Expand" : "Collapse"} project`)
        .on_click(() => this.fold(g.id))
        .child(h_flex().items_center().gap(6)
          .when(!rail, el => el.child(image("mods/imperial-chrome/ornaments/mission.svg").w(15).h(15).flex_none()))
          .child(div().min_w(0).flex_1().truncate().font_family("TeX Gyre Pagella").font_bold().text_size(rail ? 10 : 16).text_color(t.accent).child(rail ? String(g.members.length) : g.name.toUpperCase()))
          .when(!rail, el => el.child(div().flex_none().px(5).py(1).border(1).border_color("#A94935").bg("#4C1018").text_size(9).text_color("#F5D99F").child(`${g.members.length} UNITS`)))
          .child(div().flex_none().text_color(g.counts.blocked ? t.blocked : t.accent).text_size(13).child(closed ? "›" : "⌄")))
        .when(!rail, el => el.child(badges(t, g.counts, false)))
        .when(rail && g.counts.blocked > 0, el => el.child(div().text_color(t.blocked).text_size(10).child(`${g.counts.blocked} !`))),
        !rail ? ["tl", "tr", ...(closed ? ["bl", "br"] : [])] : [], 13));
      if (!closed) for (const a of g.members) {
        if (a.address === active) selectedIndex = rows.length;
        rows.push(this.row(a, g, cast, t, rail, now, observed, dense, a === g.members.at(-1)));
      }
    }
    if (focusChanged && selectedIndex >= 0) this.scroll.scroll_to_item(selectedIndex);
    return v_flex().size_full().min_h(0).bg(t.chrome).font_family("Geist Mono").text_size(12)
      .child(h_flex().relative().h(44).flex_none().px(10).gap(4).items_center().justify_center()
        .when(!rail, el => el.child(image("mods/imperial-chrome/ornaments/section.svg").absolute().left(0).top(0).w_full().h(44)))
        .child(div().relative().text_color(t.accent).font_family("TeX Gyre Pagella").text_size(rail ? 10 : 20).font_bold().child(rail ? "UNITS" : "ADEPTUS ASTARTES")))
      .when(!rail, el => el.child(h_flex().h(22).flex_none().px(9).items_center().justify_between()
        .child(div().text_color(t.dim).text_size(9).child(`${members.length} UNITS · BY SPACE`))
        .child(div().id("imperial-density").px(5).text_color(t.muted).text_size(9).cursor_pointer().tooltip("Switch between detailed and compact Marine rows")
          .on_click(() => setShared("imperial-command.dense", !dense)).child(dense ? "DETAILED ▤" : "COMPACT ▤"))))
      .when(members.length === 0 && !rail, el => el.child(div().px(12).py(8).text_color(t.muted).child("Awaiting agent status from Herdr.")))
      .child(v_flex().id("imperial-agent-list").flex_1().min_h(0).px(rail ? 0 : 5).overflow_y_scrollbar().mode("always")
        .track_scroll(this.scroll).track_focus(this.handle)
        .on_key_down((event, cx) => {
          const key = event.key;
          if (key === "down" || key === "up") { run(key === "down" ? "agent.next" : "agent.prev"); cx.stop_propagation(); }
        }).children(rows))
      .when(rail, el => el.child(div().id("imperial-unfold").h(26).text_center().text_color(t.accent).cursor_pointer().on_click(toggleSidebar).child("»")));
  }
}
