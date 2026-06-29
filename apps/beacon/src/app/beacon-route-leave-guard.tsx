import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from "react";

/**
 * A guard the active route registers to intercept attempts to leave it. It receives the pending
 * navigation as `proceed` and owns the decision: run `proceed()` now when it is safe to leave, or stash
 * it and surface a confirmation (e.g. an unsaved-changes dialog) that runs `proceed()` later.
 */
export type BeaconRouteLeaveGuard = (proceed: () => void) => void;

type BeaconRouteLeaveGuardApi = {
  /** Replace the active route's guard. Pass `null` to clear it (routes do this on unmount). */
  registerGuard: (guard: BeaconRouteLeaveGuard | null) => void;
  /** External nav controls (e.g. the header back button) call this instead of navigating directly. */
  requestLeave: (proceed: () => void) => void;
};

const BeaconRouteLeaveGuardContext = createContext<BeaconRouteLeaveGuardApi>({
  registerGuard: () => {},
  requestLeave: (proceed) => proceed(),
});

/**
 * Bridges leave intent between app chrome (the header) and the routed feature that owns unsaved work.
 * Must wrap both the header and the routed `<Outlet>` so a single guard reference is shared across them.
 */
export function BeaconRouteLeaveGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<BeaconRouteLeaveGuard | null>(null);

  const api = useMemo<BeaconRouteLeaveGuardApi>(
    () => ({
      registerGuard: (guard) => {
        guardRef.current = guard;
      },
      requestLeave: (proceed) => {
        const guard = guardRef.current;
        if (guard) {
          guard(proceed);
        } else {
          proceed();
        }
      },
    }),
    []
  );

  return <BeaconRouteLeaveGuardContext.Provider value={api}>{children}</BeaconRouteLeaveGuardContext.Provider>;
}

/**
 * Register `guard` as the active route's leave guard for the lifetime of the calling component. Pass `null`
 * (or a guard that only blocks under some condition) to opt out. Re-registers when `guard`'s identity
 * changes, so keep it memoized with up-to-date dependencies (e.g. an unsaved/dirty flag).
 */
export function useRegisterRouteLeaveGuard(guard: BeaconRouteLeaveGuard | null) {
  const { registerGuard } = useContext(BeaconRouteLeaveGuardContext);
  useEffect(() => {
    registerGuard(guard);
    return () => registerGuard(null);
  }, [registerGuard, guard]);
}

/** Returns a `requestLeave(proceed)` that runs the active route's guard (or proceeds when none is set). */
export function useRequestRouteLeave(): BeaconRouteLeaveGuardApi["requestLeave"] {
  return useContext(BeaconRouteLeaveGuardContext).requestLeave;
}
