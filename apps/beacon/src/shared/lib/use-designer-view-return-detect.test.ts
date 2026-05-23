/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignerViewReturnDetect } from "@/shared/lib/use-designer-view-return-detect";

describe("useDesignerViewReturnDetect", () => {
  const getCurrentPage = vi.fn();
  const getCurrentMode = vi.fn();
  const subscribe = vi.fn();

  beforeEach(() => {
    getCurrentPage.mockReset().mockResolvedValue({ id: "page-1" });
    getCurrentMode.mockReset().mockResolvedValue("design");
    subscribe.mockReset().mockImplementation(() => vi.fn());
    vi.stubGlobal("webflow", {
      getCurrentPage,
      getCurrentMode,
      subscribe,
    });
  });

  it("resets when disabled", async () => {
    const { result, rerender } = renderHook(
      ({ enabled, resetToken }) => useDesignerViewReturnDetect(enabled, resetToken),
      { initialProps: { enabled: true, resetToken: 0 } }
    );

    await waitFor(() => {
      expect(getCurrentPage).toHaveBeenCalled();
    });

    rerender({ enabled: false, resetToken: 0 });
    expect(result.current).toBe(false);
  });

  it("re-arms baseline when resetToken changes", async () => {
    const { rerender } = renderHook(({ enabled, resetToken }) => useDesignerViewReturnDetect(enabled, resetToken), {
      initialProps: { enabled: true, resetToken: 0 },
    });

    await waitFor(() => {
      expect(getCurrentPage).toHaveBeenCalledTimes(1);
    });

    rerender({ enabled: true, resetToken: 1 });

    await waitFor(() => {
      expect(getCurrentPage).toHaveBeenCalledTimes(2);
    });
  });
});
