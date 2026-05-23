import { cn } from "@/shared/lib/utils";
import { TileGridListItem, TilePanel, TilePresetContent } from "@/shared/ui/tile";

type PresetSummaryRowProps = {
  label: string;
  summary: string;
};

function PresetSummaryRow(props: PresetSummaryRowProps) {
  const { label, summary } = props;

  return (
    <TileGridListItem>
      <TilePanel tileVariant="presetListReadonly">
        <TilePresetContent title={label} meta={summary} />
      </TilePanel>
    </TileGridListItem>
  );
}

type PresetSummaryListProps = {
  rows: ReadonlyArray<{ id: string; label: string; summary: string }>;
  className?: string;
};

function PresetSummaryList(props: PresetSummaryListProps) {
  const { rows, className } = props;

  if (rows.length === 0) {
    return null;
  }

  return (
    <ul className={cn("m-0 grid list-none grid-cols-1 gap-3 p-0", className)}>
      {rows.map((row) => (
        <PresetSummaryRow key={row.id} label={row.label} summary={row.summary} />
      ))}
    </ul>
  );
}

export { PresetSummaryList, PresetSummaryRow };
