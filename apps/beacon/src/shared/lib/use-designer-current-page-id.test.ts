/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignerCurrentPageId } from "@/shared/lib/use-designer-current-page-id";
import { readCurrentPageIdOrNull } from "@/shared/lib/webflow-page-canvas-context";

vi.mock("@/shared/lib/webflow-page-canvas-context", () => ({
  readCurrentPageIdOrNull: vi.fn(),
}));

describe("useDesignerCurrentPageId", () => {
  const subscribe = vi.fn();

  beforeEach(() => {
    vi.mocked(readCurrentPageIdOrNull).mockReset();
    subscribe.mockReset().mockReturnValue(() => {});
    vi.stubGlobal("webflow", { subscribe });
  });

  it("reads the initial page id and marks ready", async () => {
    vi.mocked(readCurrentPageIdOrNull).mockResolvedValue("page_1");

    const { result } = renderHook(() => useDesignerCurrentPageId());

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.pageId).toBe("page_1");
  });

  it("updates when currentpage fires", async () => {
    vi.mocked(readCurrentPageIdOrNull).mockResolvedValueOnce("page_1").mockResolvedValueOnce("page_2");
    let handler: (() => void) | undefined;
    subscribe.mockImplementation((_event, cb) => {
      handler = cb;
      return () => {};
    });

    const { result } = renderHook(() => useDesignerCurrentPageId());

    await waitFor(() => {
      expect(result.current.pageId).toBe("page_1");
    });

    await act(async () => {
      handler?.();
    });

    await waitFor(() => {
      expect(result.current.pageId).toBe("page_2");
    });
  });

  it("clears page id when the canvas is not a page", async () => {
    vi.mocked(readCurrentPageIdOrNull).mockResolvedValueOnce("page_1").mockResolvedValueOnce(null);
    let handler: (() => void) | undefined;
    subscribe.mockImplementation((_event, cb) => {
      handler = cb;
      return () => {};
    });

    const { result } = renderHook(() => useDesignerCurrentPageId());

    await waitFor(() => {
      expect(result.current.pageId).toBe("page_1");
    });

    await act(async () => {
      handler?.();
    });

    await waitFor(() => {
      expect(result.current.pageId).toBeNull();
    });
  });
});
