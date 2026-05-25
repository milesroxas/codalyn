export type TowerUsageMeterKind = "webflow" | "image";

export type TowerUsageLimitDetails = {
  kind: TowerUsageMeterKind;
  used: number;
  limit: number;
};

const TOWER_USAGE_LIMIT_CODE = "TOWER_USAGE_LIMIT";

export class TowerUsageLimitError extends Error {
  readonly code = TOWER_USAGE_LIMIT_CODE;
  readonly details: TowerUsageLimitDetails;

  constructor(details: TowerUsageLimitDetails, message?: string) {
    super(message ?? "Monthly Tower usage limit reached.");
    this.name = "TowerUsageLimitError";
    this.details = details;
  }
}

type TowerUsageLimitPayload = {
  code?: string;
  kind?: string;
  used?: number;
  limit?: number;
};

function parseMeterKind(raw: string | undefined): TowerUsageMeterKind | null {
  if (raw === "webflow" || raw === "image") {
    return raw;
  }
  return null;
}

function parseUsageCount(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return null;
  }
  return Math.trunc(raw);
}

/** Parses Tower `/api/v1/*` 402 JSON bodies (`TOWER_USAGE_LIMIT`). */
export function parseTowerUsageLimitBody(body: string): TowerUsageLimitDetails | null {
  try {
    const payload = JSON.parse(body) as TowerUsageLimitPayload;
    if (payload.code !== TOWER_USAGE_LIMIT_CODE) {
      return null;
    }
    const kind = parseMeterKind(payload.kind);
    const used = parseUsageCount(payload.used);
    const limit = parseUsageCount(payload.limit);
    if (kind == null || used == null || limit == null) {
      return null;
    }
    return { kind, used, limit };
  } catch {
    return null;
  }
}

export function isTowerUsageLimitError(error: unknown): error is TowerUsageLimitError {
  return error instanceof TowerUsageLimitError;
}

export function getTowerUsageLimitFromError(error: unknown): TowerUsageLimitDetails | null {
  if (isTowerUsageLimitError(error)) {
    return error.details;
  }
  if (error instanceof Error) {
    const fromBody = parseTowerUsageLimitBody(error.message);
    if (fromBody != null) {
      return fromBody;
    }
    const legacyMatch = error.message.match(/Tower image optimize failed \(402\):\s*(\{[\s\S]*\})/);
    if (legacyMatch?.[1]) {
      return parseTowerUsageLimitBody(legacyMatch[1]);
    }
  }
  return null;
}
