import { useEffect, useState } from "react";
import {
  type BeaconTowerAccessPolicy,
  normalizeBeaconTowerAccessPolicy,
} from "@/features/auth/lib/beacon-tower-access-policy";
import { isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { towerFetch } from "@/shared/lib/tower-client";

export type BeaconTowerAccessPolicyState = {
  /** True early access required, false public sign-up open, null unknown (loading/unreachable/malformed). */
  earlyAccessRequired: boolean | null;
  /** True once the policy fetch has settled (resolved or failed). */
  ready: boolean;
};

const UNKNOWN_POLICY: BeaconTowerAccessPolicyState = { earlyAccessRequired: null, ready: false };

/**
 * Reads Tower's public access policy so auth UI can choose "Sign up" (gate off) vs "Request early access" (gate on).
 * Leaves `earlyAccessRequired` null on a missing/malformed/unreachable response, letting callers keep the safe default.
 */
export function useBeaconTowerAccessPolicy(): BeaconTowerAccessPolicyState {
  const [state, setState] = useState<BeaconTowerAccessPolicyState>(UNKNOWN_POLICY);

  useEffect(() => {
    if (!isTowerConfigured()) {
      setState({ earlyAccessRequired: null, ready: true });
      return;
    }

    const ac = new AbortController();
    void towerFetch("/api/v1/beacon/access-policy", { signal: ac.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`access-policy ${response.status}`);
        }
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        const policy: BeaconTowerAccessPolicy | null = normalizeBeaconTowerAccessPolicy(data);
        setState({ earlyAccessRequired: policy?.earlyAccessRequired ?? null, ready: true });
      })
      .catch(() => {
        if (ac.signal.aborted) {
          return;
        }
        setState({ earlyAccessRequired: null, ready: true });
      });

    return () => {
      ac.abort();
    };
  }, []);

  return state;
}
