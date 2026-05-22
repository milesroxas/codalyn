/** @vitest-environment jsdom */
import { getDefaultBeaconAppSettings, type ResolverOutput } from "@codalyn/webflow-kit";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { resolveMock } = vi.hoisted(() => ({
  resolveMock: vi.fn<() => ResolverOutput>(),
}));

vi.mock("@codalyn/webflow-kit", async () => {
  const actual = await vi.importActual<typeof import("@codalyn/webflow-kit")>("@codalyn/webflow-kit");
  return {
    ...actual,
    createBeaconPresetResolver: () => ({
      resolve: resolveMock,
      assertUniqueTarget: () => "ok",
    }),
  };
});

import { useResolvedExportConstraints } from "./use-resolved-export-constraints";

describe("useResolvedExportConstraints resolver delegation", () => {
  it("calls the v2 resolver instead of local precedence logic", () => {
    resolveMock.mockReturnValue({
      constraints: null,
      source: "manual",
      presetId: null,
      blockers: [],
    });
    const settings = getDefaultBeaconAppSettings();
    const target = {
      kind: "bare-image" as const,
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
      tagged: null,
    };
    renderHook(() =>
      useResolvedExportConstraints({
        enabled: true,
        settings,
        target,
      })
    );
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });
});
