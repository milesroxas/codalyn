import { useCallback, useEffect, useState } from "react";

import { fetchAssetFolderRows } from "@/features/image-editor/lib/asset-folder-ops";
import type { AssetFolderRow } from "@/features/image-editor/lib/asset-folder-row";

export function useImageEditorAssetFolders(imageSrc: string | null) {
  const [assetFolders, setAssetFolders] = useState<AssetFolderRow[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderActionBusy, setFolderActionBusy] = useState(false);
  const [selectedAssetFolderId, setSelectedAssetFolderId] = useState<string | null>(null);

  const refreshAssetFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const rows = await fetchAssetFolderRows();
      setAssetFolders(rows);
    } catch {
      setAssetFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  const createAssetFolderNamed = useCallback(
    async (name: string, parentFolderId: string | null): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) {
        return false;
      }
      setFolderActionBusy(true);
      try {
        const folder =
          parentFolderId !== null
            ? await webflow.createAssetFolder(trimmed, parentFolderId)
            : await webflow.createAssetFolder(trimmed);
        await refreshAssetFolders();
        setSelectedAssetFolderId(folder.id);
        return true;
      } catch {
        await webflow.notify({ type: "Error", message: "Could not create folder." });
        return false;
      } finally {
        setFolderActionBusy(false);
      }
    },
    [refreshAssetFolders]
  );

  useEffect(() => {
    if (!imageSrc) {
      return;
    }
    void refreshAssetFolders();
  }, [imageSrc, refreshAssetFolders]);

  useEffect(() => {
    if (selectedAssetFolderId === null) {
      return;
    }
    if (!assetFolders.some((f) => f.id === selectedAssetFolderId)) {
      setSelectedAssetFolderId(null);
    }
  }, [assetFolders, selectedAssetFolderId]);

  return {
    assetFolders,
    foldersLoading,
    folderActionBusy,
    selectedAssetFolderId,
    setSelectedAssetFolderId,
    refreshAssetFolders,
    createAssetFolderNamed,
  };
}
