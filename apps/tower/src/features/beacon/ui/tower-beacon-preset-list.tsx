"use client";

import {
  type BeaconAppSettings,
  type BeaconPresetSiteGroup,
  formatBeaconPresetDisplayName,
} from "@codalyn/webflow-kit";

import { TowerBeaconPresetCard } from "@/features/beacon/ui/tower-beacon-preset-card";

export function dedupeBeaconPresetLabel(label: string): string {
  const match = label.match(/^(.+) \((.+)\)$/);
  return match && match[1] === match[2] ? match[1] : label;
}

export function countBeaconSitePresets(group: BeaconPresetSiteGroup): number {
  return group.scopedPresets.length + (group.siteDefault ? 1 : 0);
}

export function TowerBeaconPresetRowsList(props: {
  group: BeaconPresetSiteGroup;
  defaultExportFormat?: BeaconAppSettings["defaultExportFormat"];
  /** When true, omits the site default row (for a dedicated scoped-presets section). */
  scopedOnly?: boolean;
}) {
  const { group, defaultExportFormat, scopedOnly = false } = props;
  const rows = scopedOnly
    ? group.scopedPresets
    : [
        ...(group.siteDefault ? [{ row: group.siteDefault, scope: "site-default" as const }] : []),
        ...group.scopedPresets,
      ];

  if (rows.length === 0) {
    return null;
  }

  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {rows.map(({ row, scope }) => (
        <li key={row.id} className="min-w-0">
          <TowerBeaconPresetCard
            row={row}
            scope={scope}
            displayName={formatBeaconPresetDisplayName(row, scope)}
            defaultExportFormat={defaultExportFormat}
            density="compact"
          />
        </li>
      ))}
    </ul>
  );
}
