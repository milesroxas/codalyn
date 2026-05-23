import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensurePageCanvas,
  isMissingCurrentPageError,
  readCurrentPageIdOrNull,
} from "@/shared/lib/webflow-page-canvas-context";

describe("webflow-page-canvas-context", () => {
  const getCurrentPage = vi.fn();
  const openCanvas = vi.fn();

  beforeEach(() => {
    getCurrentPage.mockReset();
    openCanvas.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal("webflow", { getCurrentPage, openCanvas });
  });

  it("detects Missing current page errors", () => {
    expect(isMissingCurrentPageError(new Error("Missing current page!"))).toBe(true);
    expect(isMissingCurrentPageError(new Error("Forbidden"))).toBe(false);
  });

  it("returns null when getCurrentPage throws Missing current page", async () => {
    getCurrentPage.mockRejectedValue(new Error("Missing current page!"));
    await expect(readCurrentPageIdOrNull()).resolves.toBeNull();
  });

  it("returns page id when getCurrentPage succeeds", async () => {
    getCurrentPage.mockResolvedValue({ id: "page_1" });
    await expect(readCurrentPageIdOrNull()).resolves.toBe("page_1");
  });

  it("reopens the last page when the canvas is on a component definition", async () => {
    getCurrentPage.mockRejectedValueOnce(new Error("Missing current page!")).mockResolvedValueOnce({ id: "page_1" });

    await expect(ensurePageCanvas("page_1")).resolves.toBe("page_1");
    expect(openCanvas).toHaveBeenCalledWith({ pageId: "page_1" });
  });

  it("returns null when no page hint is available", async () => {
    getCurrentPage.mockRejectedValue(new Error("Missing current page!"));
    await expect(ensurePageCanvas(null)).resolves.toBeNull();
    expect(openCanvas).not.toHaveBeenCalled();
  });
});
