import { describe, expect, it } from "vitest";

import { buildImageDeliveryUrl, normalizeImageId, normalizeImagesAccountHash } from "@/shared/lib/cloudflare-images";

const HASH = "mt_LnKhMMDR4a2uNBQuIoA";
const IMAGE_ID = "006b443c-5326-4f8e-fa75-ff5ff1511000";

describe("normalizeImagesAccountHash", () => {
  it("accepts the canonical hash and wrapped shape", () => {
    expect(normalizeImagesAccountHash(HASH)).toBe(HASH);
    expect(normalizeImagesAccountHash({ value: HASH })).toBe(HASH);
    expect(normalizeImagesAccountHash(`  ${HASH}  `)).toBe(HASH);
  });

  it("rejects missing/malformed hashes", () => {
    expect(normalizeImagesAccountHash(undefined)).toBeNull();
    expect(normalizeImagesAccountHash("")).toBeNull();
    expect(normalizeImagesAccountHash("has/slash")).toBeNull();
    expect(normalizeImagesAccountHash("has space")).toBeNull();
  });
});

describe("normalizeImageId", () => {
  it("accepts opaque url-safe ids", () => {
    expect(normalizeImageId(IMAGE_ID)).toBe(IMAGE_ID);
    expect(normalizeImageId({ value: IMAGE_ID })).toBe(IMAGE_ID);
  });

  it("rejects missing/malformed ids", () => {
    expect(normalizeImageId(undefined)).toBeNull();
    expect(normalizeImageId("")).toBeNull();
    expect(normalizeImageId("has/slash")).toBeNull();
    expect(normalizeImageId("has?query=1")).toBeNull();
  });
});

describe("buildImageDeliveryUrl", () => {
  it("builds the delivery URL with the default variant", () => {
    expect(buildImageDeliveryUrl({ imageId: IMAGE_ID, accountHash: HASH })).toBe(
      `https://imagedelivery.net/${HASH}/${IMAGE_ID}/public`
    );
  });

  it("builds with a custom variant", () => {
    expect(buildImageDeliveryUrl({ imageId: IMAGE_ID, accountHash: HASH, variant: "hero" })).toBe(
      `https://imagedelivery.net/${HASH}/${IMAGE_ID}/hero`
    );
  });

  it("normalizes wrapped input shapes", () => {
    expect(buildImageDeliveryUrl({ imageId: { value: IMAGE_ID }, accountHash: { value: HASH } })).toBe(
      `https://imagedelivery.net/${HASH}/${IMAGE_ID}/public`
    );
  });

  it("returns null when either half of the pair is missing or invalid", () => {
    expect(buildImageDeliveryUrl({ imageId: IMAGE_ID, accountHash: "" })).toBeNull();
    expect(buildImageDeliveryUrl({ imageId: "", accountHash: HASH })).toBeNull();
    expect(buildImageDeliveryUrl({ imageId: "bad/id", accountHash: HASH })).toBeNull();
  });
});
