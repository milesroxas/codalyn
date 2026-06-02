import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { normalizeTowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { useCallback, useEffect, useState } from "react";
import { towerFetch } from "@/shared/lib/tower-client";

export function useTowerUsageStatus(enabled: boolean): {
  status: TowerUsageStatusSnapshot | null;
  loading: boolean;
  refresh: () => void;
} {
  const [status, setStatus] = useState<TowerUsageStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }
    setLoading(true);
    void towerFetch("/api/v1/beacon/usage")
      .then(async (res) => {
        if (!res.ok) {
          setStatus(null);
          return;
        }
        const raw: unknown = await res.json();
        setStatus(normalizeTowerUsageStatusSnapshot(raw));
      })
      .catch(() => {
        setStatus(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
