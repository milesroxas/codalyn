import { MoreVertical } from "lucide-react";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import { CMS_SLOTS_RENAME_SLOT_MENU_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import {
  TileBottomPinnedLabel,
  TileButton,
  TileGridListItem,
  TileInlineLabel,
  TileOverlayButton,
  TileSurface,
} from "@/shared/ui/tile";

type CmsSlotListTileProps = {
  label: string;
  disabled?: boolean;
  busy?: boolean;
  /** Slim row layout for dense lists; falls back to the full upload-card layout when false. */
  compact?: boolean;
  onOpen: () => void;
  /** When set, renders the Designer more-actions menu in the top-right. */
  onRequestDelete?: () => void;
  onRequestRename?: () => void;
};

export function CmsSlotListTile(props: CmsSlotListTileProps) {
  const { label, disabled = false, busy = false, compact = false, onOpen, onRequestDelete, onRequestRename } = props;
  const showActionsMenu = onRequestDelete != null || onRequestRename != null;

  return (
    <TileGridListItem>
      <TileSurface>
        <TileButton
          tileVariant={compact ? "cmsUploadCompact" : "cmsUpload"}
          busy={busy}
          disabled={disabled}
          aria-label={`Open ${label}`}
          onClick={() => void onOpen()}
        >
          {compact ? (
            <TileInlineLabel>{label}</TileInlineLabel>
          ) : (
            <TileBottomPinnedLabel reserveActionSpace={showActionsMenu}>{label}</TileBottomPinnedLabel>
          )}
        </TileButton>

        {showActionsMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TileOverlayButton
                intent="menu"
                align={compact ? "center" : "top"}
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
              {onRequestRename != null ? (
                <DropdownMenuItem
                  disabled={disabled || busy}
                  onSelect={(event) => {
                    event.preventDefault();
                    onRequestRename();
                  }}
                >
                  {CMS_SLOTS_RENAME_SLOT_MENU_LABEL}
                </DropdownMenuItem>
              ) : null}
              {onRequestDelete != null ? (
                <DropdownMenuItem variant="destructive" disabled={disabled || busy} onSelect={() => onRequestDelete()}>
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TileSurface>
    </TileGridListItem>
  );
}

type CmsSlotPublishedSlotTileProps = {
  dataList: string;
  displayName?: string | null;
  disabled: boolean;
  opening: boolean;
  deleting: boolean;
  renaming: boolean;
  compact?: boolean;
  onOpen: () => void;
  onRequestDelete: () => void;
  onRequestRename: () => void;
};

export function CmsSlotPublishedSlotTile(props: CmsSlotPublishedSlotTileProps) {
  const {
    dataList,
    displayName,
    disabled,
    opening,
    deleting,
    renaming,
    compact,
    onOpen,
    onRequestDelete,
    onRequestRename,
  } = props;
  const label = displayLabelForCmsSlotList({ dataList, displayName });

  return (
    <CmsSlotListTile
      label={label}
      disabled={disabled}
      busy={opening || deleting || renaming}
      compact={compact}
      onOpen={onOpen}
      onRequestDelete={onRequestDelete}
      onRequestRename={onRequestRename}
    />
  );
}
