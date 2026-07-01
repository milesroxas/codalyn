import { IconDragDrop, IconPhotoShare } from "@tabler/icons-react";
import type { MarketingFeatureRole } from "@/shared/ui/marketing-feature-row";
import type { MarketingFeaturePanelAccent, MarketingVideoSlotShader } from "@/shared/ui/marketing-shader-presets";

export const BEACON_MARKETING_COPY = {
  title: "Beacon",
  description: "Extending Webflow capabilities and providing tools for scaling websites with confidence",
  heroVideo: {
    // Cloudflare Stream video UID (same account as the milesroxas project).
    streamUid: "e652512a1aec7357bd78d18c594534d3",
    // Cloudflare Images id used as the hero poster.
    posterImageId: "006b443c-5326-4f8e-fa75-ff5ff1511000",
  },
} as const;

type BeaconMarketingFeature = {
  id: string;
  title: string;
  accent: MarketingFeaturePanelAccent;
  mediaPosition: "start" | "end";
  roles: readonly MarketingFeatureRole[];
  videoSrc?: string;
  videoStreamUid?: string;
  videoPoster?: string;
  mediaShader?: MarketingVideoSlotShader;
};

export const BEACON_MARKETING_FEATURES: readonly BeaconMarketingFeature[] = [
  {
    id: "cms-slots",
    title: "CMS Slots",
    accent: "magenta",
    mediaPosition: "end",
    mediaShader: "cmsSlots",
    videoStreamUid: "413f760f22c5e0637539f53f95bcfff1",
    roles: [
      {
        label: "Designer",
        steps: ["Install and Create slots", "Add components and props", "Save and sync updates"],
      },
      {
        label: "Composer",
        steps: ["Navigate to collection page", "Select available slot", "Add components and content"],
      },
    ],
  },
  {
    id: "image-upload",
    title: "Image Upload",
    accent: "violet",
    mediaPosition: "start",
    mediaShader: "imageUpload",
    videoStreamUid: "f8ba09f719ccd61e13da07bae73ab163",
    roles: [
      {
        label: "Designer",
        steps: ["Add preset and select surface", "Configure preset values", "Save to enable preset"],
      },
      {
        label: "Composer",
        steps: ["Select surface", "Upload and edit crop", "Adjust optimization quality and file info"],
      },
    ],
  },
] as const;

export const BEACON_MARKETING_FEATURE_ICONS = {
  "cms-slots": IconDragDrop,
  "image-upload": IconPhotoShare,
} as const;

export type BeaconMarketingFeatureId = keyof typeof BEACON_MARKETING_FEATURE_ICONS;
