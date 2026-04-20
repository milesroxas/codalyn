export function SettingsPanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-1" aria-busy="true" aria-label="Loading settings">
      <div className="h-8 w-2/5 animate-pulse rounded-lg bg-muted" />
      <div className="h-24 w-full animate-pulse rounded-lg bg-muted/80" />
      <div className="h-24 w-full animate-pulse rounded-lg bg-muted/60" />
    </div>
  );
}
