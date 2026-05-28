import { describe, expect, it } from "vitest";
import { resolveCmsSlotsRouteTask } from "@/features/cms-slots/model/cms-slots-route-task";
import {
  CMS_SLOTS_OPENING_MESSAGE,
  CMS_SLOTS_ROUTE_TASK_ADDING_COMPONENT,
  CMS_SLOTS_ROUTE_TASK_APPLYING_COMPOSITION,
  CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL,
  CMS_SLOTS_ROUTE_TASK_CHECKING_LIST_TARGET,
  CMS_SLOTS_ROUTE_TASK_FOCUSING_ON_CANVAS,
  CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION,
  CMS_SLOTS_ROUTE_TASK_SAVING_EXPOSED_PROPS,
  CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT,
  CMS_SLOTS_ROUTE_TASK_TAGGING_DATA_ATTRIBUTES,
  CMS_SLOTS_SCAN_MESSAGE,
} from "@/shared/lib/cms-slots-feature-copy";

const idleInput = {
  pageBootBlocking: false,
  routeTaskPhase: null,
  openingBeaconKey: null,
  composerOpeningKey: null,
  isComposer: false,
  picking: false,
  activeComposer: null,
  composerEligibleLoading: false,
  addPending: false,
  resyncingEngineSlotKey: null,
  listTargetCreatePending: false,
  listTargetFocusOnCanvasPending: false,
  listTargetPlaceOnCanvasPending: false,
  listTargetRemovePending: false,
  listTargetPhase: "synced" as const,
  listTargetOnCanvasCountResolved: true,
  slotPropsWritePending: false,
  embedSyncPending: false,
  composerSavePending: false,
  removingKey: null,
  deletePendingKey: null,
  createPending: false,
  cmsFieldLinkRetryPending: false,
};

describe("resolveCmsSlotsRouteTask", () => {
  it("returns scan message during page boot", () => {
    expect(resolveCmsSlotsRouteTask({ ...idleInput, pageBootBlocking: true })?.message).toBe(CMS_SLOTS_SCAN_MESSAGE);
  });

  it("prefers explicit route task phase over pending flags", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        routeTaskPhase: "Saving slot config…",
        addPending: true,
      })?.message
    ).toBe("Saving slot config…");
  });

  it("prioritizes resync over add pending", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        resyncingEngineSlotKey: "row-1",
        addPending: true,
      })?.message
    ).toBe(CMS_SLOTS_ROUTE_TASK_TAGGING_DATA_ATTRIBUTES);
  });

  it("returns add pending when no higher-priority task is active", () => {
    expect(resolveCmsSlotsRouteTask({ ...idleInput, addPending: true })?.message).toBe(
      CMS_SLOTS_ROUTE_TASK_ADDING_COMPONENT
    );
  });

  it("returns focusing on canvas when focus pending", () => {
    expect(resolveCmsSlotsRouteTask({ ...idleInput, listTargetFocusOnCanvasPending: true })?.message).toBe(
      CMS_SLOTS_ROUTE_TASK_FOCUSING_ON_CANVAS
    );
  });

  it("returns checking list target while synced canvas count is unresolved", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        picking: true,
        listTargetPhase: "synced",
        listTargetOnCanvasCountResolved: false,
      })?.message
    ).toBe(CMS_SLOTS_ROUTE_TASK_CHECKING_LIST_TARGET);
  });

  it("returns checking install when route task phase is set during install", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        routeTaskPhase: CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL,
      })?.message
    ).toBe(CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL);
  });

  it("returns opening message while a slot list is opening", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        openingBeaconKey: "beacon-1",
      })?.message
    ).toBe(CMS_SLOTS_OPENING_MESSAGE);
  });

  it("returns null when idle", () => {
    expect(resolveCmsSlotsRouteTask(idleInput)).toBeNull();
  });

  it("returns saving exposed props when slot props write is pending", () => {
    expect(resolveCmsSlotsRouteTask({ ...idleInput, slotPropsWritePending: true })?.message).toBe(
      CMS_SLOTS_ROUTE_TASK_SAVING_EXPOSED_PROPS
    );
  });

  it("prefers composer save phase over generic saving composition flag", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        routeTaskPhase: CMS_SLOTS_ROUTE_TASK_APPLYING_COMPOSITION,
        composerSavePending: true,
      })?.message
    ).toBe(CMS_SLOTS_ROUTE_TASK_APPLYING_COMPOSITION);
  });

  it("returns syncing page script when embed sync is pending without an explicit phase", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        embedSyncPending: true,
      })?.message
    ).toBe(CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT);
  });

  it("returns saving composition when composer save is pending without an explicit phase", () => {
    expect(
      resolveCmsSlotsRouteTask({
        ...idleInput,
        composerSavePending: true,
      })?.message
    ).toBe(CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION);
  });
});
