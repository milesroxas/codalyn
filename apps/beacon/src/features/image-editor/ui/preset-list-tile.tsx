import { Trash2 } from "lucide-react";

import { TileButton, TileGridListItem, TileOverlayButton, TilePresetContent, TileSurface } from "@/shared/ui/tile";

type PresetListTileProps = {
  displayName: string;
  dimensionsLabel: string;
  disabled?: boolean;
  onOpen: () => void;
  onRequestDelete: () => void;
};

export function PresetListTile(props: PresetListTileProps) {
  const { displayName, dimensionsLabel, disabled = false, onOpen, onRequestDelete } = props;

  return (
    <TileGridListItem>
      <TileSurface>
        <TileButton
          tileVariant="presetListInteractive"
          disabled={disabled}
          aria-label={`Edit preset “${displayName}”`}
          onClick={() => void onOpen()}
        >
          <TilePresetContent title={displayName} meta={dimensionsLabel} />
        </TileButton>
        <TileOverlayButton
          intent="destructive"
          disabled={disabled}
          aria-label={`Delete preset “${displayName}”`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete();
          }}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </TileOverlayButton>
      </TileSurface>
    </TileGridListItem>
  );
}
