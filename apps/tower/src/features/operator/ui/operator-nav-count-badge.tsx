import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

export function OperatorNavCountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? "99+" : String(count);

  return (
    <Badge
      variant="destructive"
      aria-label={`${count} pending`}
      className={cn("ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 tabular-nums", className)}
    >
      {label}
    </Badge>
  );
}
