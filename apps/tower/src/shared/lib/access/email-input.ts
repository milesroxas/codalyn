export function normalizeAccessEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function parseAccessEmailInput(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const email = normalizeAccessEmail(raw);
  if (email.length < 3 || !email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return null;
  }
  return email;
}

const MAX_TEAM_MEMBER_EMAILS = 10;

export function parseTeamMemberEmailsInput(raw: unknown, options?: { excludeEmail?: string }): string[] | null {
  if (raw == null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const exclude = options?.excludeEmail ? normalizeAccessEmail(options.excludeEmail) : null;
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const entry of raw) {
    const parsed = parseAccessEmailInput(entry);
    if (!parsed) {
      return null;
    }
    if (exclude && parsed === exclude) {
      continue;
    }
    if (seen.has(parsed)) {
      continue;
    }
    seen.add(parsed);
    emails.push(parsed);
    if (emails.length > MAX_TEAM_MEMBER_EMAILS) {
      return null;
    }
  }
  return emails;
}
