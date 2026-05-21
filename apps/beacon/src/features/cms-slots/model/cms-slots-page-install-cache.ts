import { type CmsSlotListOnPage, findCmsSlotListsOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { isCmsSlotsWrapperInstalledOnPage } from "@/features/cms-slots/model/install-cms-slots-wrapper";

export type CmsSlotsPageInstallSnapshot = {
  pageId: string;
  beaconsWrapperInstalled: boolean;
  pageBeacons: CmsSlotListOnPage[];
};

let snapshot: CmsSlotsPageInstallSnapshot | null = null;
let inflight: Promise<CmsSlotsPageInstallSnapshot | null> | null = null;
let subscribedToPageChanges = false;

function ensurePageChangeInvalidation() {
  if (subscribedToPageChanges) {
    return;
  }
  if (typeof webflow === "undefined" || typeof webflow.subscribe !== "function") {
    return;
  }
  subscribedToPageChanges = true;
  webflow.subscribe("currentpage", () => {
    snapshot = null;
  });
}

/** Latest prefetched install snapshot (any page). Use for optimistic first paint when navigating on the same canvas page. */
export function peekCmsSlotsPageInstallCache(): CmsSlotsPageInstallSnapshot | null {
  return snapshot;
}

export function writeCmsSlotsPageInstallCache(next: CmsSlotsPageInstallSnapshot): void {
  ensurePageChangeInvalidation();
  snapshot = next;
}

export function invalidateCmsSlotsPageInstallCache(): void {
  snapshot = null;
}

export function readCmsSlotsPageInstallInitialState(): {
  pageBeacons: CmsSlotListOnPage[];
  beaconsWrapperInstalled: boolean;
  routeStateKnown: boolean;
} {
  const cached = peekCmsSlotsPageInstallCache();
  if (cached == null) {
    return { pageBeacons: [], beaconsWrapperInstalled: false, routeStateKnown: false };
  }
  return {
    pageBeacons: cached.pageBeacons,
    beaconsWrapperInstalled: cached.beaconsWrapperInstalled,
    routeStateKnown: true,
  };
}

export async function prefetchCmsSlotsPageInstall(): Promise<CmsSlotsPageInstallSnapshot | null> {
  ensurePageChangeInvalidation();
  if (inflight != null) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const page = await webflow.getCurrentPage();
      const pageId = String(page.id);
      const [pageBeacons, beaconsWrapperInstalled] = await Promise.all([
        findCmsSlotListsOnPage(),
        isCmsSlotsWrapperInstalledOnPage(),
      ]);
      const next = { pageId, pageBeacons, beaconsWrapperInstalled };
      snapshot = next;
      return next;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
