/** Carried in dataTransfer; some embedded / iframe DnD contexts are flaky with `text/plain` only. */
export const BEACON_COMPOSER_REORDER_DND_MIME = "application/x-codalyn-beacon-composer-reorder" as const;

export function readDraggedKeyFromDataTransfer(t: DataTransfer | null, fallback: string | null): string | null {
  if (t == null) return fallback;
  const a = t.getData("text/plain");
  if (a) return a;
  const b = t.getData(BEACON_COMPOSER_REORDER_DND_MIME);
  return b || fallback;
}
