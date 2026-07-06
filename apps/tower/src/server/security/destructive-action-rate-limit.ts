import { assertPostgresRateLimit, isRateLimitWindowExpired, RateLimitError } from "@/server/security/rate-limit";

const WORKSPACE_DELETE_RATE_LIMIT = {
  maxAttempts: 5,
  windowSeconds: 300,
} as const;

/** Distinct subclass so `workspaceDeleteErrorResponse` can map only workspace-delete throttling. */
export class DestructiveActionRateLimitError extends RateLimitError {
  constructor() {
    super("Too many attempts. Try again later.");
    this.name = "DestructiveActionRateLimitError";
  }
}

export { isRateLimitWindowExpired };

export async function assertWorkspaceDeleteRateLimit(actorUserId: string): Promise<void> {
  await assertPostgresRateLimit(
    `workspace-delete:${actorUserId}`,
    WORKSPACE_DELETE_RATE_LIMIT,
    () => new DestructiveActionRateLimitError()
  );
}
