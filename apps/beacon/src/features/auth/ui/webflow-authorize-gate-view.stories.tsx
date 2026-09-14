import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { WebflowAuthorizeGateView } from "@/features/auth/ui/webflow-authorize-gate-view";

const readyLink = {
  href: "https://webflow.com/oauth/authorize?client_id=demo&state=demo",
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
  onPointerEnter: fn(),
  onFocus: fn(),
  onClick: fn(),
};

/**
 * Body of the site-authorization gate. The consent screen is an ordinary new-tab link (the extension
 * opens no windows), so the primary action changes with the authorize-URL mint state.
 */
const meta = {
  title: "Auth/WebflowAuthorizeGateView",
  component: WebflowAuthorizeGateView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex h-[28rem] flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    siteLabel: "Acme Marketing",
    state: { kind: "ready", url: readyLink.href, mintedAt: 0 },
    linkProps: readyLink,
    onRetry: fn(),
    onSignOut: fn(),
  },
} satisfies Meta<typeof WebflowAuthorizeGateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Authorize URL minted: the primary action is a link to Webflow's consent screen. */
export const Ready: Story = {};

/** Minting the authorize URL from Tower — disabled, busy primary action. */
export const Minting: Story = {
  args: { state: { kind: "minting" }, linkProps: null },
};

/** Tower declined (workspace-admin required): actionable message plus "Try again". */
export const ErrorTeamAdminRequired: Story = {
  args: { state: { kind: "error", error: "team_admin_required" }, linkProps: null },
};

/** Tower unreachable: generic retry path. */
export const ErrorTowerUnreachable: Story = {
  args: { state: { kind: "error", error: "tower_unreachable" }, linkProps: null },
};
