import { beforeEach, describe, expect, it } from "vitest";

import {
  invalidateCmsSlotsPageInstallCache,
  peekCmsSlotsPageInstallCache,
  readCmsSlotsPageInstallInitialState,
  writeCmsSlotsPageInstallCache,
} from "@/features/cms-slots/model/cms-slots-page-install-cache";

describe("cms-slots-page-install-cache", () => {
  beforeEach(() => {
    invalidateCmsSlotsPageInstallCache();
  });

  it("returns the latest snapshot for optimistic route entry", () => {
    expect(peekCmsSlotsPageInstallCache()).toBeNull();

    writeCmsSlotsPageInstallCache({
      pageId: "page-1",
      beaconsWrapperInstalled: true,
      pageBeacons: [],
    });

    expect(peekCmsSlotsPageInstallCache()?.beaconsWrapperInstalled).toBe(true);
    expect(peekCmsSlotsPageInstallCache()?.pageId).toBe("page-1");
  });

  it("seeds initial route state from cache", () => {
    writeCmsSlotsPageInstallCache({
      pageId: "page-1",
      beaconsWrapperInstalled: true,
      pageBeacons: [],
    });

    expect(readCmsSlotsPageInstallInitialState()).toEqual({
      pageBeacons: [],
      beaconsWrapperInstalled: true,
      routeStateKnown: true,
    });
  });

  it("clears snapshot on invalidate", () => {
    writeCmsSlotsPageInstallCache({
      pageId: "page-1",
      beaconsWrapperInstalled: false,
      pageBeacons: [],
    });
    invalidateCmsSlotsPageInstallCache();
    expect(peekCmsSlotsPageInstallCache()).toBeNull();
  });
});
