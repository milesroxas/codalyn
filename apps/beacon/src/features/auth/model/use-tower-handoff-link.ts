import { readBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";
import { resolveTowerAppHref, TOWER_HANDOFF_TOKEN_STALE_MS } from "@/features/auth/lib/tower-app-link";
import { getTowerAuthBaseUrl, mintTowerHandoffToken } from "@/features/auth/model/tower-auth-client";
import {
  type PreparedExternalLink,
  type PrepareExternalLinkResult,
  usePreparedExternalLink,
} from "@/features/auth/model/use-prepared-external-link";

/**
 * A Tower page opened from a gate as an explicit two-step control: the user's click mints the single-use
 * session-handoff token (`useTowerAppLink` pre-mints on hover/focus for the header and account links,
 * which never sit on a gate), then the minted `/beacon-handoff#ott=…` URL opens as a plain new-tab
 * anchor. Nothing is requested on mount (review round 9, 2026-09-28). With no Tower bearer, or when the
 * mint fails, the destination is the plain route, which enforces its own sign-in. `null` when no Tower
 * origin is configured for this build.
 */
export function useTowerHandoffLink(path: string): PreparedExternalLink | null {
  const towerOrigin = getTowerAuthBaseUrl();
  const link = usePreparedExternalLink(
    async (): Promise<PrepareExternalLinkResult> => {
      const token = readBeaconTowerSessionToken() ? await mintTowerHandoffToken() : null;
      const href = resolveTowerAppHref({ towerOrigin, path, token });
      return href ? { ok: true, url: href } : { ok: false, error: "tower_not_configured" };
    },
    { staleMs: TOWER_HANDOFF_TOKEN_STALE_MS }
  );
  return towerOrigin ? link : null;
}
