export type AssetFolderRow = {
  id: string;
  name: string;
  /** `parent` folder id, or `null` if this folder sits at the top level of Assets. */
  parentId: string | null;
  /** Full path for display, e.g. `Brand / Logos`. */
  pathLabel: string;
  handle: AssetFolder;
};
