import { MoreVertical } from "lucide-react";
import { displayLabelForDataList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { TileBottomPinnedLabel, TileButton, TileGridListItem, TileOverlayButton, TileSurface } from "@/shared/ui/tile";

type CmsSlotListTileProps = {
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onOpen: () => void;
  /** When set, renders the Engine more-actions menu in the top-right. */
  onRequestDelete?: () => void;
};

export function CmsSlotListTile(props: CmsSlotListTileProps) {
  const { label, disabled = false, busy = false, onOpen, onRequestDelete } = props;
  const showActionsMenu = onRequestDelete != null;

  return (
    <TileGridListItem>
      <TileSurface>
        <TileButton
          tileVariant="cmsUpload"
          busy={busy}
          disabled={disabled}
          aria-label={`Open ${label}`}
          onClick={() => void onOpen()}
        >
          <TileBottomPinnedLabel reserveActionSpace={showActionsMenu}>{label}</TileBottomPinnedLabel>
        </TileButton>

        {showActionsMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TileOverlayButton
                intent="menu"
                disabled={disabled}
                aria-label={`More actions for ${label}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreVertical aria-hidden className="size-4" strokeWidth={2} />
              </TileOverlayButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuItem disabled={disabled || busy} onSelect={() => void onOpen()}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" disabled={disabled || busy} onSelect={() => onRequestDelete()}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TileSurface>
    </TileGridListItem>
  );
}

type CmsSlotPublishedSlotTileProps = {
  dataList: string;
  disabled: boolean;
  opening: boolean;
  deleting: boolean;
  onOpen: () => void;
  onRequestDelete: () => void;
};

export function CmsSlotPublishedSlotTile(props: CmsSlotPublishedSlotTileProps) {
  const { dataList, disabled, opening, deleting, onOpen, onRequestDelete } = props;
  const label = displayLabelForDataList(dataList);

  return (
    <CmsSlotListTile
      label={label}
      disabled={disabled}
      busy={opening || deleting}
      onOpen={onOpen}
      onRequestDelete={onRequestDelete}
    />
  );
}
