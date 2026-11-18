// Read-only view of the existing Claude statusline cache. No account/network access.
export const USAGE_FILE = ".claude/rate-limits.json";
const WINDOWS = [["five_hour", "5h"], ["seven_day", "Sett."]];
const DAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const pad = n => String(n).padStart(2, "0");

export function toMs(value) {
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) value = Number(value);
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return value > 0 && Number.isFinite(new Date(ms).getTime()) ? ms : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function until(ms) {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}g ${Math.floor(mins / 60) % 24}h`;
}

export function localLabel(ms, offset) {
  const known = typeof offset === "number" && Number.isFinite(offset) && Math.abs(offset) <= 840;
  const date = new Date(ms + (known ? offset : 0) * 60000);
  return `${DAYS[date.getUTCDay()]} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}${known ? "" : " UTC"}`;
}

export function parseUsage(text, now = Date.now()) {
  let data;
  try { data = typeof text === "string" ? JSON.parse(text) : null; } catch { return null; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const updated = toMs(data.updated);
  const stale = updated == null || now - updated > 10 * 60000;
  const quotas = WINDOWS.flatMap(([key, label]) => {
    const raw = data.rate_limits?.[key];
    const value = raw?.used_percentage;
    if (value == null || (typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) return [];
    const used = Number(value);
    if (!Number.isFinite(used) || used < 0 || used > 100) return [];
    const reset = toMs(raw.resets_at);
    const expired = reset != null && reset <= now;
    // A passed reset is not proof that the account has a fresh quota.
    const renewal = reset == null ? "" : expired ? "rinnovo da verificare"
      : key === "five_hour" ? `rinnovo tra ${until(reset - now)}` : `rinnovo ${localLabel(reset, data.utc_offset_min)}`;
    return [{ key, label, used: Math.round(used * 10) / 10, left: Math.round((100 - used) * 10) / 10,
      reset, expired, renewal, remainingTime: reset != null && !expired ? until(reset - now) : null }];
  });
  return quotas.length ? { quotas, updated, stale } : null;
}
