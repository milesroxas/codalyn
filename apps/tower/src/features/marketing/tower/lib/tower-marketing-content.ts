import { IconPlug, IconUsers } from "@tabler/icons-react";
import type { MarketingFeatureRole } from "@/shared/ui/marketing-feature-row";
import type { MarketingFeaturePanelAccent, MarketingVideoSlotShader } from "@/shared/ui/marketing-shader-presets";

export const TOWER_MARKETING_COPY = {
  title: "Tower",
  description: "Your Webflow workspace, unified — team access, OAuth connections, and Beacon settings in one place",
} as const;

type TowerMarketingFeature = {
  id: string;
  title: string;
  accent: MarketingFeaturePanelAccent;
  mediaPosition: "start" | "end";
  roles: readonly MarketingFeatureRole[];
  videoSrc?: string;
  videoPoster?: string;
  mediaShader?: MarketingVideoSlotShader;
};

export const TOWER_MARKETING_FEATURES: readonly TowerMarketingFeature[] = [
  {
    id: "workspaces",
    title: "Workspaces",
    accent: "magenta",
    mediaPosition: "end",
    mediaShader: "cmsSlots",
    roles: [
      {
        label: "Workspace Admin",
        steps: ["Create a workspace", "Invite team members", "Manage roles and access"],
      },
      {
        label: "Team Member",
        steps: ["Accept workspace invite", "Switch active workspace", "Collaborate with your team"],
      },
    ],
  },
  {
    id: "webflow-connection",
    title: "Webflow Connection",
    accent: "violet",
    mediaPosition: "start",
    mediaShader: "imageUpload",
    roles: [
      {
        label: "Workspace Admin",
        steps: ["Authorize Webflow OAuth", "Select connected sites", "Manage API access for the workspace"],
      },
      {
        label: "Team Member",
        steps: ["View connection status", "Access authorized sites", "Use connected data in Beacon"],
      },
    ],
  },
] as const;

export const TOWER_MARKETING_FEATURE_ICONS = {
  workspaces: IconUsers,
  "webflow-connection": IconPlug,
} as const;

export type TowerMarketingFeatureId = keyof typeof TOWER_MARKETING_FEATURE_ICONS;
