import { describe, expect, it } from "vitest";

import { resolveCmsMedia, resolveCmsStreamVideo } from "@/features/marketing/cms/lib/resolve-cms-media";
import type { Media, StreamVideo } from "@/payload-types";

const UID = "e652512a1aec7357bd78d18c594534d3";

const media = (overrides: Partial<Media> = {}): Media =>
  ({
    id: 1,
    alt: "Poster",
    url: "https://blob.example.com/poster.jpg",
    updatedAt: "2026-07-13T00:00:00.000Z",
    createdAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  }) as Media;

const streamVideo = (overrides: Partial<StreamVideo> = {}): StreamVideo =>
  ({
    id: 1,
    title: "Product demo",
    uid: UID,
    updatedAt: "2026-07-13T00:00:00.000Z",
    createdAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  }) as StreamVideo;

describe("resolveCmsMedia", () => {
  it("resolves the canonical populated shape", () => {
    const doc = media();
    expect(resolveCmsMedia(doc)).toBe(doc);
  });

  it("returns null for the depth-0 numeric-id shape", () => {
    expect(resolveCmsMedia(42)).toBeNull();
  });

  it("returns null for missing values", () => {
    expect(resolveCmsMedia(null)).toBeNull();
    expect(resolveCmsMedia(undefined)).toBeNull();
  });

  it("returns null when the populated doc has no usable URL", () => {
    expect(resolveCmsMedia(media({ url: undefined }))).toBeNull();
    expect(resolveCmsMedia(media({ url: "" }))).toBeNull();
  });
});

describe("resolveCmsStreamVideo", () => {
  it("resolves the canonical populated shape", () => {
    expect(resolveCmsStreamVideo(streamVideo())).toEqual({
      uid: UID,
      title: "Product demo",
      posterUrl: null,
    });
  });

  it("normalizes an alternate whitespace-padded UID shape", () => {
    expect(resolveCmsStreamVideo(streamVideo({ uid: `  ${UID}  ` }))?.uid).toBe(UID);
  });

  it("returns null for the depth-0 numeric-id shape", () => {
    expect(resolveCmsStreamVideo(42)).toBeNull();
  });

  it("returns null for missing values", () => {
    expect(resolveCmsStreamVideo(null)).toBeNull();
    expect(resolveCmsStreamVideo(undefined)).toBeNull();
  });

  it("returns null for malformed UIDs instead of partially applying", () => {
    expect(resolveCmsStreamVideo(streamVideo({ uid: "" }))).toBeNull();
    expect(resolveCmsStreamVideo(streamVideo({ uid: "has/slash" }))).toBeNull();
    expect(resolveCmsStreamVideo(streamVideo({ uid: "has space" }))).toBeNull();
  });

  it("falls back to a generic label when the title is empty", () => {
    expect(resolveCmsStreamVideo(streamVideo({ title: "   " }))?.title).toBe("Video");
  });

  it("resolves the populated poster relation to its URL", () => {
    expect(resolveCmsStreamVideo(streamVideo({ poster: media() }))?.posterUrl).toBe(
      "https://blob.example.com/poster.jpg"
    );
  });

  it("degrades an unpopulated or malformed poster to null without blocking playback", () => {
    expect(resolveCmsStreamVideo(streamVideo({ poster: 7 }))?.posterUrl).toBeNull();
    expect(resolveCmsStreamVideo(streamVideo({ poster: media({ url: "" }) }))?.posterUrl).toBeNull();
  });
});
