import { describe, expect, it } from "vitest";
import { resolveAssetFolderHandleForExport, resolveSelectedAssetFolderHandle } from "./asset-folder-ops";
import type { AssetFolderRow } from "./asset-folder-row";

function row(id: string, handle: object): AssetFolderRow {
  return {
    id,
    name: id,
    parentId: null,
    pathLabel: id,
    handle: handle as AssetFolderRow["handle"],
  };
}

describe("resolveSelectedAssetFolderHandle", () => {
  it("returns undefined when nothing selected", () => {
    expect(resolveSelectedAssetFolderHandle(null, [row("a", {})])).toBeUndefined();
  });

  it("returns handle for selected id", () => {
    const h = { id: "h" };
    expect(resolveSelectedAssetFolderHandle("a", [row("a", h)])).toBe(h);
  });
});

describe("resolveAssetFolderHandleForExport", () => {
  const firstHandle = { id: "hf1" };
  const secondHandle = { id: "hf2" };
  const folders = [row("first", firstHandle), row("second", secondHandle)];

  it("uses picked folder when set", () => {
    expect(resolveAssetFolderHandleForExport("second", folders, { useDefaultWhenUnpicked: true })).toBe(secondHandle);
  });

  it("uses first sorted folder when unpicked and cms primary upload", () => {
    expect(resolveAssetFolderHandleForExport(null, folders, { useDefaultWhenUnpicked: true })).toBe(firstHandle);
  });

  it("returns undefined when unpicked and default not allowed", () => {
    expect(resolveAssetFolderHandleForExport(null, folders, { useDefaultWhenUnpicked: false })).toBeUndefined();
  });
});
