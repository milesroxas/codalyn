import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME,
  ensurePublishPlaceholderImageAssetId,
} from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";

describe("ensurePublishPlaceholderImageAssetId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses an existing site asset with the fixed filename", async () => {
    vi.stubGlobal("webflow", {
      getSiteInfo: vi.fn().mockResolvedValue({ siteId: "site-1" }),
      getAllAssets: vi.fn().mockResolvedValue([
        {
          id: "asset-existing",
          getName: vi.fn().mockResolvedValue(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME),
        },
      ]),
      createAsset: vi.fn(),
    });

    await expect(ensurePublishPlaceholderImageAssetId()).resolves.toBe("asset-existing");
    expect(webflow.createAsset).not.toHaveBeenCalled();
  });

  it("creates the placeholder asset when missing", async () => {
    vi.stubGlobal("webflow", {
      getSiteInfo: vi.fn().mockResolvedValue({ siteId: "site-2" }),
      getAllAssets: vi.fn().mockResolvedValue([]),
      createAsset: vi.fn().mockResolvedValue({ id: "asset-new" }),
    });

    await expect(ensurePublishPlaceholderImageAssetId()).resolves.toBe("asset-new");
    expect(webflow.createAsset).toHaveBeenCalledTimes(1);
    const file = vi.mocked(webflow.createAsset).mock.calls[0]?.[0] as File;
    expect(file.name).toBe(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME);
  });
});
