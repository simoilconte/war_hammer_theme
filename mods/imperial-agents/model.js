// Native Herdr data only. No screen scraping, processes, network or global sorting settings.
export const CHAPTERS = [
  { id: "ultramarines", name: "Ultramarines", color: "#315B9C" },
  { id: "blood-angels", name: "Blood Angels", color: "#BE4140" },
  { id: "dark-angels", name: "Dark Angels", color: "#255345" },
  { id: "imperial-fists", name: "Imperial Fists", color: "#E9BC38" },
  { id: "raven-guard", name: "Raven Guard", color: "#545E70" },
  { id: "white-scars", name: "White Scars", color: "#DFE5E5" },
  { id: "salamanders", name: "Salamanders", color: "#61A345" },
  { id: "space-wolves", name: "Space Wolves", color: "#8DA9BD" },
];
export const CAST_KEY = "imperial-command.cast.v1";
export const FOLD_KEY = "imperial-command.folded.v1";
export const STATES = ["blocked", "working", "done", "idle"];
export const LABELS = { blocked: "Needs You", working: "Working", done: "Done", idle: "Idle", unknown: "No status" };
const RANK = { blocked: 4, done: 3, working: 2, idle: 1, unknown: 0 };
export const record = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
export const statusOf = value => value === "error" ? "blocked" : STATES.includes(value) ? value : "unknown";

// Preserve entries during empty/partial startup snapshots and temporarily unavailable machines.
// Only live members count toward the next draw. Never reassign an existing session on a state change.
export function assignChapters(stored, members, random = Math.random) {
  const cast = { ...record(stored) };
  const ids = CHAPTERS.map(c => c.id);
  const addresses = [...new Set(members.map(a => a.address))];
  for (const address of addresses) {
    if (ids.includes(cast[address])) continue;
    const uses = id => addresses.filter(a => cast[a] === id).length;
    const fewest = Math.min(...ids.map(uses));
    const free = ids.filter(id => uses(id) === fewest);
    cast[address] = free[Math.min(free.length - 1, Math.floor(random() * free.length))];
  }
  return cast;
}

// A depth-first forest. Children with panes appear once, under their parent.
// Use agents() for user-facing state; raw child "done" is idle, as in Middle-earth:
// the child reports to its parent, rather than announcing a completed user task.
export function groupAgents(list, all, projectList) {
  const listed = new Map(list.map(a => [a.address, a]));
  const live = new Map(all.filter(t => t.state === "live").map(t => [t.address, t]));
  const parentOf = address => live.get(address)?.parent;
  const hasListedAncestor = address => {
    const seen = new Set([address]);
    let parent = parentOf(address);
    while (parent && !seen.has(parent)) {
      if (listed.has(parent)) return true;
      seen.add(parent);
      parent = parentOf(parent);
    }
    return false;
  };
  const children = new Map();
  for (const t of live.values()) {
    if (!t.parent) continue;
    if (!children.has(t.parent)) children.set(t.parent, []);
    children.get(t.parent).push(t);
  }
  const groups = new Map();
  const visited = new Set();
  const visit = (a, group, depth) => {
    if (visited.has(a.address)) return;
    visited.add(a.address);
    group.members.push({ ...a, depth });
    for (const k of children.get(a.address) ?? []) {
      const known = listed.get(k.address);
      visit(known ?? {
        ...k, pane: null, space: a.space, space_name: a.space_name, tab: a.tab,
        tab_name: a.tab_name, focused: false, pinned: Boolean(k.labels?.["herdr.pinned"]),
        status: statusOf(k.status === "done" ? "idle" : k.status),
      }, group, depth + 1);
    }
  };
  const roots = list.filter(a => !hasListedAncestor(a.address));
  const projects = new Map(projectList.map(s => [s.id, s]));
  const addRoot = a => {
    const s = projects.get(a.space);
    if (!groups.has(a.space)) groups.set(a.space, { id: a.space, name: s?.name ?? a.space_name ?? "Unassigned", space: s, members: [] });
    visit({ ...a, status: statusOf(a.status) }, groups.get(a.space), 0);
  };
  // Pinned first, within their own Space. Other agents stay in Herdr's tab/pane order.
  for (const a of [...roots.filter(a => a.pinned), ...roots.filter(a => !a.pinned)]) addRoot(a);
  // Protect against malformed/cyclic parents: never silently drop a listed agent.
  for (const a of list) if (!visited.has(a.address)) addRoot(a);
  const order = new Map(projectList.map((s, i) => [s.id, i]));
  return [...groups.values()].sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity)).map(g => ({
    ...g, counts: counts(g.members), urgent: g.members.reduce((s, a) => RANK[a.status] > RANK[s] ? a.status : s, "unknown"),
  }));
}

export function counts(list) {
  return Object.fromEntries(STATES.map(s => [s, list.filter(a => a.status === s).length]));
}

export function projectDetail(space, paneList = []) {
  if (!space) return "";
  const tabs = new Set((space.tabs ?? []).map(t => t.id));
  const folder = paneList.find(p => tabs.has(p.tab) && p.cwd)?.cwd || space.folder || "";
  const base = folder.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
  const repo = base.toLowerCase() === space.name.toLowerCase() ? "" : base;
  return [repo, space.machine].filter(Boolean).join(" · ");
}

export function sessionName(a) {
  return a.name || a.program?.name || a.app || a.address;
}
export function taskName(a, space) {
  const tab = space?.tabs?.find(t => t.id === a.tab);
  if (tab?.named) return tab.name;
  const title = (a.title ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();
  if (title && !/^[~/]|^[A-Za-z]:\\/.test(a.title ?? "") && !title.includes("@") && title !== a.address && title !== a.program?.name) return title;
  return a.tab_name && !/^\d+$/.test(a.tab_name) ? a.tab_name : "";
}
