import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, assignChapters, groupAgents, counts, statusOf, projectDetail, taskName } from "../mods/imperial-agents/model.js";

const spaces = [
  { id: "rx", name: "Forge", folder: "/work/ForgeCore", tabs: [{ id: "r1", name: "MISSION-101", named: true }] },
  { id: "qr", name: "Vox Relay", folder: "/work/ForgeCore", tabs: [{ id: "q1" }] },
];
const agent = (address, space = "rx", status = "working", extra = {}) => ({ address, space, status, pane: `p-${address}`, tab: "r1", ...extra });

test("eight different chapters before reuse; balanced assignment for 30 live agents", () => {
  const roster = Array.from({ length: 30 }, (_, i) => agent(`t${i}`));
  const cast = assignChapters({}, roster, () => 0);
  assert.equal(new Set(Object.values(assignChapters({}, roster.slice(0, 8), () => 0))).size, 8);
  const uses = CHAPTERS.map(c => Object.values(cast).filter(id => id === c.id).length);
  assert.ok(Math.max(...uses) - Math.min(...uses) <= 1);
});

test("assignment survives serialized restart, status changes, partial/empty machine snapshots", () => {
  const list = [agent("t1"), agent("remote/t1"), agent("t2")];
  const cast = assignChapters({}, list, () => 0);
  const restarted = JSON.parse(JSON.stringify(cast));
  assert.deepEqual(assignChapters(restarted, []), cast);
  assert.deepEqual(assignChapters(restarted, [agent("t1", "qr", "blocked")]), cast);
  assert.deepEqual(assignChapters(restarted, [...list].reverse().map(a => ({ ...a, status: "done" }))), cast);
  assert.notEqual(cast.t1, cast["remote/t1"]);
});

test("new session reuses a released chapter without changing existing sessions", () => {
  const all = Array.from({ length: 8 }, (_, i) => agent(`t${i}`));
  const cast = assignChapters({}, all, () => 0);
  const next = assignChapters(cast, [...all.slice(1), agent("tNew")], () => 0);
  assert.equal(next.tNew, cast.t0);
  for (const a of all.slice(1)) assert.equal(next[a.address], cast[a.address]);
});

test("same-repository Spaces remain separate even when agent list is interleaved", () => {
  const list = [agent("t1", "rx", "working"), agent("t2", "qr", "blocked"), agent("t3", "rx", "done"), agent("t4", "rx", "idle")];
  const groups = groupAgents(list, [], spaces);
  assert.deepEqual(groups.map(g => g.id), ["rx", "qr"]);
  assert.deepEqual(groups[0].members.map(a => a.address), ["t1", "t3", "t4"]);
  assert.deepEqual(groups[0].counts, { blocked: 0, working: 1, done: 1, idle: 1 });
  assert.equal(groups[1].counts.blocked, 1);
  assert.equal(groups[1].urgent, "blocked");
  assert.equal(projectDetail(spaces[0]), "ForgeCore");
});

test("live descendants inherit project, kept children appear once, blocked descendants count", () => {
  const list = [agent("p"), agent("kept", "rx", "done")];
  const all = [{ address: "p", state: "live" },
    { address: "sub", parent: "p", state: "live", status: "blocked" },
    { address: "kept", parent: "sub", state: "live", status: "done" },
    { address: "raw-done", parent: "p", state: "live", status: "done" },
    { address: "gone", parent: "p", state: "exited", status: "error" }];
  const [g] = groupAgents(list, all, spaces);
  assert.deepEqual(g.members.map(a => [a.address, a.depth]), [["p", 0], ["sub", 1], ["kept", 2], ["raw-done", 1]]);
  assert.equal(g.counts.blocked, 1);
  assert.equal(g.counts.done, 1);
  assert.equal(g.counts.idle, 1);
  assert.equal(g.members[1].space, "rx");
});

test("new Spaces appear dynamically; pinned agents stay inside their project", () => {
  const groups = groupAgents([agent("a"), agent("b", "qr", "blocked", { pinned: true }), agent("c", "new", "working")], [], [...spaces, { id: "new", name: "New project" }]);
  assert.deepEqual(groups.map(g => g.id), ["rx", "qr", "new"]);
  assert.equal(groups[2].name, "New project");
  assert.equal(groups[1].members[0].address, "b");
});

test("cyclic parents terminate without losing or duplicating sessions", () => {
  const groups = groupAgents([agent("a"), agent("b")], [{ address: "a", parent: "b", state: "live" }, { address: "b", parent: "a", state: "live" }], spaces);
  assert.deepEqual(groups.flatMap(g => g.members).map(a => a.address).sort(), ["a", "b"]);
});

test("unknown data never claims a working or complete task; named tasks take precedence", () => {
  assert.equal(statusOf(null), "unknown");
  assert.equal(statusOf("waiting"), "unknown");
  assert.equal(statusOf("error"), "blocked");
  assert.equal(taskName(agent("a"), spaces[0]), "MISSION-101");
  assert.deepEqual(counts([agent("a", "rx", "unknown")]), { blocked: 0, working: 0, done: 0, idle: 0 });
});

test("invalid persisted casting is repaired without replacing valid assignments", () => {
  assert.equal(assignChapters({ t1: "obsolete", t2: "blood-angels" }, [agent("t1"), agent("t2")], () => 0).t2, "blood-angels");
  assert.equal(Object.keys(assignChapters(null, [agent("a")])).length, 1);
});
