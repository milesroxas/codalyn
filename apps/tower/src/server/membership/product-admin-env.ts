function parseCommaList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** `TOWER_PRODUCT_ADMIN_EMAILS` — comma-separated emails; compared case-insensitively. */
export function parseProductAdminEmailsNormalized(): string[] {
  return parseCommaList(process.env.TOWER_PRODUCT_ADMIN_EMAILS).map((e) => e.toLowerCase());
}
