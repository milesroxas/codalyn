import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  AvifPresetConsentNotice,
  AvifTowerActiveDisclosure,
  AvifTowerConsentPrompt,
} from "@/features/image-editor/ui/avif-tower-consent-notice";

const meta = {
  title: "ImageEditor/AvifTowerConsentNotice",
  component: AvifTowerConsentPrompt,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof AvifTowerConsentPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Explicit opt-in prompt shown when the user selects AVIF before consenting — nothing is sent to Tower until Confirm. */
export const ConsentPrompt: Story = {};

/** Always-visible disclosure line while AVIF is the active export format (never tooltip-only). */
export const ActiveDisclosure: Story = {
  render: () => <AvifTowerActiveDisclosure />,
};

/** A locked preset requests AVIF but the user has not opted in — exports use WebP until enabled. */
export const PresetAwaitingConsent: Story = {
  render: () => <AvifPresetConsentNotice onEnable={fn()} />,
};
