import {
  formatBeaconPresetDisplayName,
  formatBeaconPresetExportSummary,
  listBeaconPresetStorageEntries,
} from "@codalyn/webflow-kit";
import { useMemo } from "react";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import {
  IMAGE_UPLOAD_PRESETS_SECTION_LABEL,
  IMAGE_UPLOAD_SITE_DEFAULT_SECTION_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import { PresetSummaryList } from "@/shared/ui/preset-summary-row";

export function SettingsPresetsPanel() {
  const { settings } = useBeaconAppSettings();

  const { exportPresetRows, siteDefaultPresetRow } = useMemo(() => {
    const rows = listBeaconPresetStorageEntries(settings.imagePresetStorage).map(({ row, scope }) => ({
      id: row.id,
      scope,
      label: formatBeaconPresetDisplayName(row, scope),
      summary: formatBeaconPresetExportSummary(row),
    }));

    return {
      exportPresetRows: rows.filter((row) => row.scope !== "site-default"),
      siteDefaultPresetRow: rows.find((row) => row.scope === "site-default") ?? null,
    };
  }, [settings.imagePresetStorage]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">{IMAGE_UPLOAD_PRESETS_SECTION_LABEL}</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Scoped presets are managed from the image editor Configure flow. This list reflects what is stored for your
          workspace.
        </p>
      </div>
      {exportPresetRows.length === 0 ? (
        <p className="text-muted-foreground text-xs">No scoped presets yet.</p>
      ) : (
        <PresetSummaryList rows={exportPresetRows} />
      )}

      {siteDefaultPresetRow ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">{IMAGE_UPLOAD_SITE_DEFAULT_SECTION_LABEL}</h2>
          <PresetSummaryList rows={[siteDefaultPresetRow]} />
        </div>
      ) : null}
    </div>
  );
}
