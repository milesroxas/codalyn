import { Loader2, MoreVertical } from "lucide-react";
import { displayLabelForDataList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

type CmsSlotPublishedSlotTileProps = {
  slotList: CmsSlotListOnPage;
  disabled: boolean;
  opening: boolean;
  deleting: boolean;
  onOpen: () => void;
  onRequestDelete: () => void;
};

export function CmsSlotPublishedSlotTile(props: CmsSlotPublishedSlotTileProps) {
  const { slotList, disabled, opening, deleting, onOpen, onRequestDelete } = props;
  const label = displayLabelForDataList(slotList.dataList);
  const showMainSpinner = opening || deleting;

  return (
    <li className="list-none">
      <div className="relative w-full">
        <button
          type="button"
          className={cn(
            "relative flex min-h-[6.75rem] w-full flex-col rounded-xl border border-border/80 bg-card text-left shadow-sm outline-none transition-[border-color,background-color,opacity]",
            "hover:border-border hover:bg-muted/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
            showMainSpinner && "pointer-events-none opacity-60"
          )}
          disabled={disabled}
          aria-busy={showMainSpinner}
          aria-label={`Open ${label}`}
          onClick={() => void onOpen()}
        >
          <span className="pointer-events-none absolute bottom-3 left-3.5 right-11 text-sm font-medium text-foreground">
            {label}
          </span>
          {showMainSpinner ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-card/80">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            </span>
          ) : null}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="absolute top-1.5 right-1.5 z-10 text-foreground/90 hover:bg-muted/60 hover:text-foreground"
              disabled={disabled}
              aria-label={`More actions for ${label}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical aria-hidden className="size-4" strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem disabled={disabled || opening} onSelect={() => void onOpen()}>
              Open
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" disabled={disabled || deleting} onSelect={() => onRequestDelete()}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
