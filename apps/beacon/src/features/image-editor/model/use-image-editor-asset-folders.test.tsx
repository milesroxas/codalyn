/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAssetFolderRows } from "@/features/image-editor/lib/asset-folder-ops";

import { useImageEditorAssetFolders } from "./use-image-editor-asset-folders";

vi.mock("@/features/image-editor/lib/asset-folder-ops", () => ({
  fetchAssetFolderRows: vi.fn(),
}));

describe("useImageEditorAssetFolders", () => {
  const mockFolderHandle = { id: "h1" };

  beforeEach(() => {
    vi.mocked(fetchAssetFolderRows).mockResolvedValue([
      {
        id: "a",
        name: "Root",
        parentId: null,
        pathLabel: "Root",
        handle: mockFolderHandle as never,
      },
    ]);
    vi.stubGlobal("webflow", {
      createAssetFolder: vi.fn().mockResolvedValue({ id: "new-folder" }),
      notify: vi.fn(),
    });
  });

  it("loads folders when imageSrc becomes available", async () => {
    const { rerender } = renderHook(({ src }: { src: string | null }) => useImageEditorAssetFolders(src), {
      initialProps: { src: null as string | null },
    });
    expect(fetchAssetFolderRows).not.toHaveBeenCalled();
    rerender({ src: "blob:test" });
    await waitFor(() => expect(fetchAssetFolderRows).toHaveBeenCalledTimes(1));
  });

  it("returns false for empty folder name without calling Webflow", async () => {
    const { result } = renderHook(() => useImageEditorAssetFolders("blob:x"));
    await waitFor(() => expect(result.current.assetFolders.length).toBeGreaterThan(0));

    await act(async () => {
      const ok = await result.current.createAssetFolderNamed("   ", null);
      expect(ok).toBe(false);
    });
    const wf = (globalThis as unknown as { webflow: { createAssetFolder: ReturnType<typeof vi.fn> } }).webflow;
    expect(wf.createAssetFolder).not.toHaveBeenCalled();
  });
});
