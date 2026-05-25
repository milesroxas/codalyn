import { parseTowerUsageLimitBody, TOWER_USAGE_LIMIT_CODE, type TowerUsageMeterKind } from "@codalyn/webflow-kit";

export type { TowerUsageMeterKind };

export type TowerUsageLimitDetails = {
  kind: TowerUsageMeterKind;
  used: number;
  limit: number;
};

export class TowerUsageLimitError extends Error {
  readonly code = TOWER_USAGE_LIMIT_CODE;
  readonly details: TowerUsageLimitDetails;

  constructor(details: TowerUsageLimitDetails, message?: string) {
    super(message ?? "Monthly Tower usage limit reached.");
    this.name = "TowerUsageLimitError";
    this.details = details;
  }
}

export { parseTowerUsageLimitBody };

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
