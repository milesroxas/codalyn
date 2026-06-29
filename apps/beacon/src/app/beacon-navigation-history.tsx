import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BEACON_HOME_PATH, resolveBeaconRouteParent, resolveUpNavigation } from "@/app/beacon-route-hierarchy";

/**
 * Tracks the pathname visited at each history index so the header's up control can pop straight to an
 * existing parent entry instead of replaying intermediate jumps. React Router (v7 HashRouter) stamps the
 * current index onto `history.state.idx`; we index recorded pathnames by it. Indexes are only ever read for
 * entries earlier than the current one, so we never need to truncate the forward stack on back navigation.
 */
type BeaconNavigationHistoryApi = {
  entriesRef: MutableRefObject<Array<string | undefined>>;
};

const BeaconNavigationHistoryContext = createContext<BeaconNavigationHistoryApi | null>(null);

/** Current React Router history index (`0` when history state has not been stamped yet). */
function readHistoryIdx(): number {
  return (window.history.state as { idx?: number } | null)?.idx ?? 0;
}

/**
 * Records the pathname for each history index as the user navigates. Must sit inside the router and wrap any
 * consumer of {@link useNavigateUp} (the header).
 */
export function BeaconNavigationHistoryProvider({ children }: { children: ReactNode }) {
  const entriesRef = useRef<Array<string | undefined>>([]);
  const location = useLocation();

  // Depend on the whole `location` (its identity changes on every navigation, including same-path re-pushes
  // that still advance the history index) so each entry's pathname is recorded against its index.
  useEffect(() => {
    entriesRef.current[readHistoryIdx()] = location.pathname;
  }, [location]);

  const api = useMemo<BeaconNavigationHistoryApi>(() => ({ entriesRef }), []);

  return <BeaconNavigationHistoryContext.Provider value={api}>{children}</BeaconNavigationHistoryContext.Provider>;
}

/**
 * Returns an `navigateUp()` that moves to the current route's hierarchical parent (see
 * {@link resolveBeaconRouteParent}). It pops to the parent's existing back-stack entry when one exists —
 * collapsing any tool-to-tool ping-pong in a single step — and otherwise pushes the parent. Routes without a
 * parent (the Home hub) no-op. Callers that own unsaved work should still gate this behind the route leave guard.
 */
export function useNavigateUp(): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useContext(BeaconNavigationHistoryContext);

  return useCallback(() => {
    const parent = resolveBeaconRouteParent(location.pathname);
    if (!parent) {
      return;
    }
    // Without the tracker we cannot inspect the back stack; fall back to a deterministic push to Home so the
    // control still never ping-pongs.
    if (!context) {
      navigate(parent);
      return;
    }
    const plan = resolveUpNavigation(context.entriesRef.current, readHistoryIdx(), parent);
    if (plan.kind === "pop") {
      navigate(plan.delta);
    } else {
      navigate(plan.to);
    }
  }, [navigate, location.pathname, context]);
}

/** Display label for a parent route, used to announce the up control's destination to assistive tech. */
export function beaconParentRouteLabel(parentPath: string): string {
  return parentPath === BEACON_HOME_PATH ? "home" : "back";
}
