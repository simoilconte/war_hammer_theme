// Adapted from Middle-earth fellowship-status (MIT); native Herdr state only.
import { View, div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, shared, readTextFile, home, checking } from "herdr";
import { USAGE_FILE, parseUsage } from "./usage.js";

const STATES = ["blocked", "working", "done", "idle"];
const LABELS = { blocked: "Needs You", working: "Working", done: "Done", idle: "Idle" };
const SYMBOLS = { blocked: "!", working: "W", done: "D", idle: "I" };

export default class ImperialStatus extends View {
  init(_props, cx) {
    this.usage = null;
    this.reading = false;
    if (checking()) return;
    this.readUsage(cx);
    cx.timer.every(20000, cx => this.readUsage(cx));
  }

  readUsage(cx) {
    if (this.reading) return;
    this.reading = true;
    cx.spawn(async cx => {
      let text = null;
      try { text = await readTextFile(`${home()}/${USAGE_FILE}`); } catch {}
      const now = Date.now();
      const next = parseUsage(text, now);
      const signature = JSON.stringify([next, Math.floor(now / 60000)]);
      this.reading = false;
      if (signature === this.usageSignature) return;
      this.usageSignature = signature;
      this.usage = next;
      cx.notify();
    });
  }

  quota(t, quota) {
    const color = quota.used >= 90 ? "#F08072" : quota.used >= 75 ? t.accent : t.done;
    const note = quota.expired ? quota.renewal : this.usage.stale ? "ultimo dato" : quota.renewal;
    const updated = this.usage.updated == null ? "Aggiornamento non indicato" : `Ultimo dato: ${new Date(this.usage.updated).toISOString()}`;
    const tooltip = [`Claude ${quota.label}: ${quota.used}% usato, ${quota.left}% rimasto`, quota.renewal,
      quota.remainingTime ? `Tra ${quota.remainingTime}` : "", updated,
      this.usage.stale ? "Dato non aggiornato negli ultimi 10 minuti" : "",
      "Fonte: statusline locale di Claude. Clic per rileggere il dato."].filter(Boolean).join("\n");
    return h_flex().id(`imperial-usage-${quota.key}`).flex_none().items_center().gap(7).px(5).cursor_pointer().tooltip(tooltip)
      .on_click((_e, cx) => this.readUsage(cx))
      .child(div().w(55).h(6).rounded(2).bg(t.border)
        .child(div().h_full().w(`${quota.used}%`).rounded(2).bg(color)))
      .child(div().font_semibold().text_color(color).child(`${quota.label} ${quota.used}% usato`))
      .when(Boolean(note), el => el.child(div().max_w(220).truncate().text_color(t.muted).child(`· ${note}`)));
  }

  render() {
    const t = theme(), sp = spaces(), active = sp.find(s => s.active);
    const list = agents();
    // The roster publishes deduplicated parent + descendant counts. No cross-mod imports.
    const totals = shared("imperial-command.counts.v1") ?? Object.fromEntries(STATES.map(s => [s, list.filter(a => a.status === s).length]));
    const total = Object.values(totals).reduce((n, c) => n + c, 0);
    return h_flex().relative().size_full().px(14).gap(14).items_center().bg(t.chrome).border(1).border_color(t.border).font_family("Geist Mono").text_size(10.5).text_color(t.muted)
      .child(image("mods/imperial-chrome/ornaments/aquila.svg").w(44).h(21).flex_none())
      .child(div().flex_none().text_color(t.accent).child(active?.machine ?? "This computer"))
      .child(div().min_w(0).max_w(180).truncate().child([active?.name, active?.branch].filter(Boolean).join(" / ")))
      .children(STATES.filter(s => totals[s] > 0).map(s => div().flex_none().text_color(t[s]).tooltip(`${totals[s]} ${LABELS[s]}`).child(`● ${totals[s]} ${LABELS[s]}`)))
      .when(total === 0, el => el.child("Awaiting deployment"))
      .child(div().flex_1())
      .when(Boolean(this.usage), el => el.child(div().flex_none().text_color(t.dim).text_size(9).child("CLAUDE"))
        .children(this.usage.quotas.map(quota => this.quota(t, quota))))
      .when(!this.usage, el => el.child(div().id("imperial-usage-unavailable").flex_none().text_color(t.dim).text_size(10)
        .tooltip("Il file locale ~/.claude/rate-limits.json non contiene una quota valida. Nessun dato viene stimato.").child("Usage Claude: n/d")))
      .child(div().id("imperial-status-palette").cursor_pointer().text_color(t.accent).tooltip("Open Herdr command palette").on_click(() => run("app.palette")).child("⌘⇧P  COMMANDS"));
  }
}
