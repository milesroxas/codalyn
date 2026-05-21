/** Normalize string values for boolean Composer fields. */
export function parseBoolString(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

/** Normalize to `#RRGGBB` for `<input type="color">`. */
export function colorInputValue(s: string): string {
  const t = s.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) {
    return t;
  }
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`;
  }
  return "#000000";
}

/** Normalize stored strings for `<input type="date">` (accepts YYYY-MM-DD or parseable dates). */
export function dateInputValue(s: string): string {
  const t = s.trim();
  if (t.length === 0) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    return t.slice(0, 10);
  }
  const d = Date.parse(t);
  if (Number.isNaN(d)) {
    return "";
  }
  return new Date(d).toISOString().slice(0, 10);
}
