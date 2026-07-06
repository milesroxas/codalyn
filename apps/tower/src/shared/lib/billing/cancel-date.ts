/** Long-form date for pending-cancellation copy (e.g. "August 6, 2026"). */
export function formatCancelDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
}
