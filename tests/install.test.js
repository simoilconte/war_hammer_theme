import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "imperial-package-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, "checkout");
  mkdirSync(source);
  for (const name of ["mods", "themes", "layouts", "tools", "LICENSE", "settings.imperial-alerts.json"]) {
    cpSync(resolve(name), join(source, name), {
      recursive: true,
      filter: path => !["gpui-kit.d.ts", "herdr.d.ts", "jsconfig.json", "__pycache__"].includes(basename(path)),
    });
  }
  const app = join(root, "herdr-config");
  mkdirSync(app);
  for (const name of ["mods", "themes", "layouts"]) mkdirSync(join(app, name));
  const settings = { zoom: 1.25, font_size: 16, sounds: { enabled: false, done: "old-done.mp3", blocked: "old-blocked.mp3" } };
  writeFileSync(join(app, "settings.json"), JSON.stringify(settings));
  writeFileSync(join(app, "keys.json"), '{"global":{}}');
  writeFileSync(join(app, "programs.json"), '{"programs":{}}');
  writeFileSync(join(app, "layouts/main.json"), '{"id":"root","type":"column","children":[]}');
  return { source, app, settings };
}

const install = f => spawnSync("python3", [join(f.source, "tools/install.py"), "--home", f.app], { encoding: "utf8", cwd: f.source });

test("fresh checkout installs all assets, creates its report folder, and preserves prior configuration", t => {
  const f = fixture(t);
  assert.equal(existsSync(join(f.source, "verification")), false);
  const result = install(f);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(readFileSync(join(f.source, "verification/install.json"), "utf8"));
  assert.equal(report.activated, false);
  assert.equal(existsSync(join(report.backup, "original-sha256.json")), true);
  assert.deepEqual(JSON.parse(readFileSync(join(report.backup, "settings.json"), "utf8")), f.settings);
  const settings = JSON.parse(readFileSync(join(f.app, "settings.json"), "utf8"));
  assert.equal(settings.zoom, 1.25);
  assert.equal(settings.font_size, 16);
  assert.deepEqual(settings.sounds, JSON.parse(readFileSync("settings.imperial-alerts.json", "utf8")).sounds);
  for (const file of [
    "layouts/imperial-command.json",
    "themes/imperial-command.json",
    "mods/imperial-agents/art/marines-atlas.png",
    "mods/imperial-chrome/fonts/texgyrepagella-bold.otf",
    "mods/imperial-status/usage.js",
    "mods/imperial-status/sounds/mission-complete.mp3",
    "mods/imperial-status/sounds/orders-required.mp3",
    "mods/imperial-pane/main.js",
    "mods/imperial-tabs/main.js",
  ]) assert.deepEqual(readFileSync(join(f.app, file)), readFileSync(join(f.source, file)), file);
  assert.equal(readFileSync(join(f.app, "layouts/main.json"), "utf8"), '{"id":"root","type":"column","children":[]}');
});

test("reinstall refuses to overwrite an existing layout or its settings", t => {
  const f = fixture(t);
  assert.equal(install(f).status, 0);
  const before = readFileSync(join(f.app, "settings.json"), "utf8");
  const result = install(f);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to overwrite/);
  assert.equal(readFileSync(join(f.app, "settings.json"), "utf8"), before);
  assert.equal(readdirSync(join(f.app, "backups")).length, 1);
});

test("uninitialized Herdr home fails before creating any files", t => {
  const f = fixture(t);
  const missing = join(f.app, "not-initialized");
  const result = spawnSync("python3", [join(f.source, "tools/install.py"), "--home", missing], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Open Herdr once/);
  assert.equal(existsSync(missing), false);
});
