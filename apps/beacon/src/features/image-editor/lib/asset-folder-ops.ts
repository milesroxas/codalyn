import type { AssetFolderRow } from "./asset-folder-row";

/** Designer typings omit `getParent` on `AssetFolder`; runtime supports it (see Webflow docs). */
async function getAssetFolderParentFolder(handle: AssetFolder): Promise<AssetFolder | null> {
  const h = handle as AssetFolder & { getParent?: () => Promise<AssetFolder | null> };
  try {
    return (await h.getParent?.()) ?? null;
  } catch {
    return null;
  }
}

export async function fetchAssetFolderRows(): Promise<AssetFolderRow[]> {
  const handles = await webflow.getAllAssetFolders();
  const partial: {
    handle: AssetFolder;
    id: string;
    name: string;
    parentId: string | null;
  }[] = [];

  for (const handle of handles) {
    const name = (await handle.getName()).trim() || "Folder";
    const parent = await getAssetFolderParentFolder(handle);
    const parentId = parent?.id ?? null;
    partial.push({ handle, id: handle.id, name, parentId });
  }

  const byId = new Map(partial.map((row) => [row.id, row]));

  const pathLabelFor = (id: string, seen = new Set<string>()): string => {
    if (seen.has(id)) {
      return byId.get(id)?.name ?? "";
    }
    seen.add(id);
    const row = byId.get(id);
    if (!row) {
      return "";
    }
    if (!row.parentId) {
      return row.name;
    }
    const parentPath = pathLabelFor(row.parentId, seen);
    return parentPath ? `${parentPath} / ${row.name}` : row.name;
  };

  const rows: AssetFolderRow[] = partial.map((p) => ({
    ...p,
    pathLabel: pathLabelFor(p.id),
  }));
  rows.sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
  return rows;
}

export function resolveSelectedAssetFolderHandle(
  selectedAssetFolderId: string | null,
  assetFolders: AssetFolderRow[]
): AssetFolder | undefined {
  if (selectedAssetFolderId === null) {
    return undefined;
  }
  return assetFolders.find((f) => f.id === selectedAssetFolderId)?.handle;
}

/** When the user did not pick a folder, optionally use the first library folder (sorted path). */
export function resolveAssetFolderHandleForExport(
  selectedAssetFolderId: string | null,
  assetFolders: AssetFolderRow[],
  options: { useDefaultWhenUnpicked: boolean }
): AssetFolder | undefined {
  const picked = resolveSelectedAssetFolderHandle(selectedAssetFolderId, assetFolders);
  if (picked) {
    return picked;
  }
  if (options.useDefaultWhenUnpicked && assetFolders.length > 0) {
    return assetFolders[0].handle;
  }
  return undefined;
}
