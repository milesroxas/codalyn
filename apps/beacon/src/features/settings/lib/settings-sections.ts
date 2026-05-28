import type { LucideIcon } from "lucide-react";
import { SlidersHorizontal, UserRound } from "lucide-react";

export type SettingsSectionId = "preferences" | "account";

export type SettingsSectionConfig = {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const SETTINGS_SCREEN_TITLE = "Settings";

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: "preferences",
    label: "Preferences",
    description: "Appearance and display",
    icon: SlidersHorizontal,
  },
  {
    id: "account",
    label: "Account",
    description: "Tower sync and workspace",
    icon: UserRound,
  },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = SETTINGS_SECTIONS[0].id;

export function getSettingsSection(id: SettingsSectionId): SettingsSectionConfig {
  const section = SETTINGS_SECTIONS.find((entry) => entry.id === id);
  if (section == null) {
    throw new Error(`Unknown settings section: ${id}`);
  }
  return section;
}
