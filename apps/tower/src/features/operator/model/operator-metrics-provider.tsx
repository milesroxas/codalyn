"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import type { OperatorMetrics } from "@/server/operator/types";

type OperatorMetricsContextValue = {
  metrics: OperatorMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const OperatorMetricsContext = createContext<OperatorMetricsContextValue | null>(null);

export function OperatorMetricsProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<OperatorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setMetrics(await operatorApi.metrics());
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load operator metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      metrics,
      loading,
      error,
      refresh,
    }),
    [metrics, loading, error, refresh]
  );

  return <OperatorMetricsContext.Provider value={value}>{children}</OperatorMetricsContext.Provider>;
}

export function useOperatorMetrics(): OperatorMetricsContextValue {
  const value = useContext(OperatorMetricsContext);
  if (!value) {
    throw new Error("useOperatorMetrics must be used within OperatorMetricsProvider");
  }
  return value;
}
