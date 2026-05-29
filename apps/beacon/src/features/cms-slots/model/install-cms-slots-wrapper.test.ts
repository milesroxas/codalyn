import { describe, expect, it } from "vitest";
import { resolveCmsSlotsDeleteBeaconNotify } from "@/features/cms-slots/model/install-cms-slots-wrapper";
import {
  CMS_SLOTS_TOAST_LIST_REMOVED,
  CMS_SLOTS_TOAST_LIST_REMOVED_INSTALL_REMAINS,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_NOT_FOUND,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_REMOVED,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_SKIPPED_NO_TOWER,
} from "@/shared/lib/cms-slots-feature-copy";

describe("resolveCmsSlotsDeleteBeaconNotify", () => {
  it("warns when the last list is deleted without page uninstall", () => {
    const notify = resolveCmsSlotsDeleteBeaconNotify({
      shouldUninstallPage: false,
      wasLastBeaconOnPage: true,
    });
    expect(notify).toEqual({ type: "Warning", message: CMS_SLOTS_TOAST_LIST_REMOVED_INSTALL_REMAINS });
  });

  it("confirms runtime removal after full uninstall", () => {
    const notify = resolveCmsSlotsDeleteBeaconNotify({
      shouldUninstallPage: true,
      wasLastBeaconOnPage: true,
      uninstallResult: {
        wrapperRemoved: true,
        runtimeRemoval: { status: "removed" },
      },
    });
    expect(notify).toEqual({ type: "Success", message: CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_REMOVED });
  });

  it("warns when Tower is missing during uninstall", () => {
    const notify = resolveCmsSlotsDeleteBeaconNotify({
      shouldUninstallPage: true,
      wasLastBeaconOnPage: true,
      uninstallResult: {
        wrapperRemoved: true,
        runtimeRemoval: { status: "skipped_no_tower" },
      },
    });
    expect(notify).toEqual({ type: "Warning", message: CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_SKIPPED_NO_TOWER });
  });

  it("succeeds when uninstall clears install but no script was present", () => {
    const notify = resolveCmsSlotsDeleteBeaconNotify({
      shouldUninstallPage: true,
      wasLastBeaconOnPage: true,
      uninstallResult: {
        wrapperRemoved: true,
        runtimeRemoval: { status: "not_found" },
      },
    });
    expect(notify).toEqual({ type: "Success", message: CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_NOT_FOUND });
  });

  it("uses the default removed toast for non-last deletes", () => {
    const notify = resolveCmsSlotsDeleteBeaconNotify({
      shouldUninstallPage: false,
      wasLastBeaconOnPage: false,
    });
    expect(notify).toEqual({ type: "Success", message: CMS_SLOTS_TOAST_LIST_REMOVED });
  });
});
