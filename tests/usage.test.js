import test from "node:test";
import assert from "node:assert/strict";
import { toMs, parseUsage, localLabel } from "../mods/imperial-status/usage.js";

const now = Date.parse("2026-11-18T14:00:00Z");
const reset = Date.parse("2026-11-19T03:00:00Z");
const snapshot = used => JSON.stringify({ updated: now / 1000, utc_offset_min: 60, rate_limits: { seven_day: { used_percentage: used, resets_at: reset / 1000 } } });

test("uses actual weekly quota and the source timezone; absent 5h quota stays absent", () => {
  const usage = parseUsage(snapshot(80), now);
  assert.equal(usage.quotas.length, 1);
  assert.equal(usage.quotas[0].key, "seven_day");
  assert.equal(usage.quotas[0].used, 80);
  assert.equal(usage.quotas[0].left, 20);
  assert.equal(usage.quotas[0].renewal, "rinnovo gio 04:00");
  assert.equal(usage.stale, false);
});

test("real zero and 100% are supported", () => {
  assert.equal(parseUsage(snapshot(0), now).quotas[0].used, 0);
  assert.equal(parseUsage(snapshot(100), now).quotas[0].left, 0);
});

test("malformed, missing and invalid values never become a fictional zero usage", () => {
  for (const text of [null, "broken", "null", "[]", "{}", '{"rate_limits":{}}']) assert.equal(parseUsage(text, now), null);
  for (const value of [null, "", "  ", true, -1, 101, "oops"]) assert.equal(parseUsage(snapshot(value), now), null);
});

test("accepts numeric percentages but rejects nonfinite data", () => {
  assert.equal(parseUsage(snapshot("80.5"), now).quotas[0].used, 80.5);
  assert.equal(parseUsage(snapshot("Infinity"), now), null);
});

test("expired reset keeps the last reported percentage and requests confirmation", () => {
  const usage = parseUsage(snapshot(80), reset + 60000);
  assert.equal(usage.quotas[0].used, 80);
  assert.equal(usage.quotas[0].left, 20);
  assert.equal(usage.quotas[0].expired, true);
  assert.equal(usage.quotas[0].renewal, "rinnovo da verificare");
  assert.equal(usage.stale, true);
});

test("stale or undated caches are marked", () => {
  assert.equal(parseUsage(snapshot(80), now + 11 * 60000).stale, true);
  const data = JSON.parse(snapshot(80)); delete data.updated;
  assert.equal(parseUsage(JSON.stringify(data), now).stale, true);
});

test("5-hour and weekly limits update independently", () => {
  const data = JSON.parse(snapshot(80));
  data.rate_limits.five_hour = { used_percentage: 25, resets_at: now + 3600000 };
  const usage = parseUsage(JSON.stringify(data), now);
  assert.deepEqual(usage.quotas.map(q => [q.key, q.used]), [["five_hour", 25], ["seven_day", 80]]);
  assert.equal(usage.quotas[0].renewal, "rinnovo tra 1h 0m");
});

test("timestamps handle seconds, milliseconds and ISO; extreme data cannot crash the UI", () => {
  assert.equal(toMs(reset / 1000), reset);
  assert.equal(toMs(String(reset / 1000)), reset);
  assert.equal(toMs(reset), reset);
  assert.equal(toMs("2026-11-19T03:00:00Z"), reset);
  for (const value of [Infinity, Number.MAX_VALUE, "", null, false, -1]) assert.equal(toMs(value), null);
  assert.equal(localLabel(reset, null), "gio 03:00 UTC");
});
