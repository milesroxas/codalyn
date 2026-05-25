/** Parses required non-negative integer limit fields for forms and operator patches. */
export function limitIntegerToDraft(value: number): string {
  return String(value);
}

export function parseRequiredLimitInteger(raw: string): number | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "invalid";
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return "invalid";
  }
  return n;
}

export function parseOptionalLimitInteger(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = parseRequiredLimitInteger(trimmed);
  return parsed;
}
