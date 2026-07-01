import { describe, expect, it } from "vitest";

import {
  buildStreamManifestUrl,
  buildStreamThumbnailUrl,
  normalizeCustomerSubdomain,
  normalizeStreamUid,
  readStringLikeValue,
} from "@/shared/lib/cloudflare-stream";

const HOST = "customer-rw5jpz5ucwlw8rg0.cloudflarestream.com";
const UID = "a1b2c3d4e5f6a7b8c9d0e1f2";

describe("readStringLikeValue", () => {
  it("reads the canonical primitive shape", () => {
    expect(readStringLikeValue(HOST)).toBe(HOST);
  });

  it("reads the wrapped { value } shape", () => {
    expect(readStringLikeValue({ value: HOST })).toBe(HOST);
    expect(readStringLikeValue({ sourceType: "env", value: HOST })).toBe(HOST);
  });

  it("trims surrounding whitespace", () => {
    expect(readStringLikeValue(`  ${HOST}  `)).toBe(HOST);
  });

  it("returns null for missing/empty/malformed values", () => {
    expect(readStringLikeValue(undefined)).toBeNull();
    expect(readStringLikeValue(null)).toBeNull();
    expect(readStringLikeValue("")).toBeNull();
    expect(readStringLikeValue("   ")).toBeNull();
    expect(readStringLikeValue(42)).toBeNull();
    expect(readStringLikeValue({})).toBeNull();
  });
});

describe("normalizeCustomerSubdomain", () => {
  it("accepts the canonical bare host", () => {
    expect(normalizeCustomerSubdomain(HOST)).toBe(HOST);
  });

  it("accepts equivalent alternate shapes", () => {
    expect(normalizeCustomerSubdomain(`https://${HOST}`)).toBe(HOST);
    expect(normalizeCustomerSubdomain(`https://${HOST}/`)).toBe(HOST);
    expect(normalizeCustomerSubdomain(`HTTPS://${HOST}/somepath`)).toBe(HOST);
    expect(normalizeCustomerSubdomain({ value: HOST })).toBe(HOST);
    expect(normalizeCustomerSubdomain(HOST.toUpperCase())).toBe(HOST);
  });

  it("rejects missing or non-stream hosts", () => {
    expect(normalizeCustomerSubdomain(undefined)).toBeNull();
    expect(normalizeCustomerSubdomain("")).toBeNull();
    expect(normalizeCustomerSubdomain("example.com")).toBeNull();
    expect(normalizeCustomerSubdomain("cloudflarestream.com")).toBeNull();
    expect(normalizeCustomerSubdomain("evil.cloudflarestream.com.attacker.net")).toBeNull();
  });
});

describe("normalizeStreamUid", () => {
  it("accepts opaque url-safe UIDs", () => {
    expect(normalizeStreamUid(UID)).toBe(UID);
    expect(normalizeStreamUid("some_id.with-parts")).toBe("some_id.with-parts");
    expect(normalizeStreamUid({ value: UID })).toBe(UID);
  });

  it("rejects missing or malformed UIDs", () => {
    expect(normalizeStreamUid(undefined)).toBeNull();
    expect(normalizeStreamUid("")).toBeNull();
    expect(normalizeStreamUid("   ")).toBeNull();
    expect(normalizeStreamUid("has/slash")).toBeNull();
    expect(normalizeStreamUid("has space")).toBeNull();
    expect(normalizeStreamUid("has?query=1")).toBeNull();
  });
});

describe("buildStreamManifestUrl", () => {
  it("builds the HLS manifest URL from a valid pair", () => {
    expect(buildStreamManifestUrl({ uid: UID, customerSubdomain: HOST })).toBe(
      `https://${HOST}/${UID}/manifest/video.m3u8`
    );
  });

  it("normalizes alternate subdomain shapes before building", () => {
    expect(buildStreamManifestUrl({ uid: UID, customerSubdomain: `https://${HOST}/` })).toBe(
      `https://${HOST}/${UID}/manifest/video.m3u8`
    );
  });

  it("returns null when either half of the pair is missing or invalid", () => {
    expect(buildStreamManifestUrl({ uid: "", customerSubdomain: HOST })).toBeNull();
    expect(buildStreamManifestUrl({ uid: UID, customerSubdomain: "" })).toBeNull();
    expect(buildStreamManifestUrl({ uid: "bad/uid", customerSubdomain: HOST })).toBeNull();
    expect(buildStreamManifestUrl({ uid: UID, customerSubdomain: "example.com" })).toBeNull();
  });
});

describe("buildStreamThumbnailUrl", () => {
  it("builds the thumbnail URL from a valid pair", () => {
    expect(buildStreamThumbnailUrl({ uid: UID, customerSubdomain: HOST })).toBe(
      `https://${HOST}/${UID}/thumbnails/thumbnail.jpg`
    );
  });

  it("appends an encoded time when provided", () => {
    expect(buildStreamThumbnailUrl({ uid: UID, customerSubdomain: HOST }, { time: "2s" })).toBe(
      `https://${HOST}/${UID}/thumbnails/thumbnail.jpg?time=2s`
    );
  });

  it("returns null on missing/invalid input", () => {
    expect(buildStreamThumbnailUrl({ uid: UID, customerSubdomain: undefined })).toBeNull();
    expect(buildStreamThumbnailUrl({ uid: undefined, customerSubdomain: HOST })).toBeNull();
  });
});
