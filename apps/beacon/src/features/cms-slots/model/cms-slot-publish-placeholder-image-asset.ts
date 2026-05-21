/** Site asset uploaded once per site for image publish-placeholder seeding (`setProps` on `imageAsset` needs an asset id). */
export const CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME = "codalyn-beacon-publish-placeholder.png";

/** 1×1 PNG — minimal file so Webflow accepts the placeholder asset. */
const PLACEHOLDER_PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49,
  0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const cachedAssetIdBySite = new Map<string, string>();

function placeholderPngFile(): File {
  return new File([PLACEHOLDER_PNG_BYTES], CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME, { type: "image/png" });
}

/** Cached Codalyn publish-placeholder asset id for the current site (after {@link ensurePublishPlaceholderImageAssetId}). */
export function getCachedPublishPlaceholderImageAssetId(siteId?: string): string | null {
  if (siteId != null) {
    return cachedAssetIdBySite.get(siteId) ?? null;
  }
  const only = [...cachedAssetIdBySite.values()];
  return only.length === 1 ? (only[0] ?? null) : null;
}

/** True when a string is the Codalyn image publish placeholder (asset id or hosted URL containing the fixed filename). */
export function isPublishPlaceholderImageReference(v: unknown): boolean {
  if (v == null) {
    return false;
  }
  const s = String(v).trim();
  if (s.length === 0) {
    return false;
  }
  if (s.includes(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME)) {
    return true;
  }
  for (const id of cachedAssetIdBySite.values()) {
    if (s === id) {
      return true;
    }
  }
  return false;
}

/**
 * Finds or creates the Codalyn publish-placeholder image on the current site.
 * `imageAsset` instance props require an asset id — a URL string triggers “Asset not found”.
 */
export async function ensurePublishPlaceholderImageAssetId(): Promise<string | null> {
  let siteId: string;
  try {
    siteId = (await webflow.getSiteInfo()).siteId;
  } catch {
    return null;
  }

  const cached = cachedAssetIdBySite.get(siteId);
  if (cached != null) {
    return cached;
  }

  try {
    const assets = await webflow.getAllAssets();
    for (const asset of assets) {
      const name = await asset.getName().catch(() => "");
      if (name === CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME) {
        cachedAssetIdBySite.set(siteId, asset.id);
        return asset.id;
      }
    }

    const created = await webflow.createAsset(placeholderPngFile());
    cachedAssetIdBySite.set(siteId, created.id);
    return created.id;
  } catch {
    return null;
  }
}
