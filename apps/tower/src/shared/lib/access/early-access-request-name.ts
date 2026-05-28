export type EarlyAccessRequestNameFields = {
  firstName?: string | null;
  lastName?: string | null;
};

export function normalizeEarlyAccessRequestNameFields(input: { firstName?: string | null; lastName?: string | null }): {
  firstName: string | null;
  lastName: string | null;
} {
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  return { firstName, lastName };
}

export function earlyAccessRequestDisplayName(fields: EarlyAccessRequestNameFields): string | null {
  const parts = [fields.firstName?.trim(), fields.lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export function parseEarlyAccessRequestNameBody(body: { firstName?: unknown; lastName?: unknown }): {
  firstName: string | null;
  lastName: string | null;
} {
  const firstName = typeof body.firstName === "string" ? body.firstName : null;
  const lastName = typeof body.lastName === "string" ? body.lastName : null;
  return normalizeEarlyAccessRequestNameFields({ firstName, lastName });
}
