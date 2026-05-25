import type { BeaconPresetStorageEntry } from "@codalyn/webflow-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { withPageComponentInstanceForDefinitionWork } = vi.hoisted(() => ({
  withPageComponentInstanceForDefinitionWork: vi.fn(async (_input: unknown) => undefined),
}));

vi.mock("@/features/image-editor/lib/page-component-instance-for-preset-work", () => ({
  withPageComponentInstanceForDefinitionWork,
}));

import { cleanupDesignerTagsForPresetEntry } from "./image-editor-preset-delete-cleanup";

describe("cleanupDesignerTagsForPresetEntry integration", () => {
  beforeEach(() => {
    withPageComponentInstanceForDefinitionWork.mockClear();
    vi.stubGlobal("webflow", {
      getCurrentPage: vi.fn().mockResolvedValue({ id: "page_1" }),
    });
  });

  it("temporarily places a component instance when clearing component preset tags", async () => {
    const entry: BeaconPresetStorageEntry = {
      scope: "component",
      row: {
        id: "preset_1",
        name: "Hero",
        width: 1200,
        height: 800,
        maxFileSizeBytes: 200_000,
        targetKey: {
          kind: "component-image",
          siteId: "site_1",
          componentDefinitionId: "cmp_1",
          imagePropId: "hero-image",
        },
      },
    };

    await expect(cleanupDesignerTagsForPresetEntry({ entry, pageIdHint: "page_1" })).resolves.toEqual({
      ok: true,
      cleaned: true,
    });
    expect(withPageComponentInstanceForDefinitionWork).toHaveBeenCalledWith(
      expect.objectContaining({
        componentDefinitionId: "cmp_1",
        pageIdHint: "page_1",
        instance: null,
      })
    );
  });
});
