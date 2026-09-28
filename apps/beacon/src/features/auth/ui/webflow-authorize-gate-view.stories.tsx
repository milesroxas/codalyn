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
 * Body of the site-authorization gate: a new authorization for the current site, asked for explicitly.
 * Nothing is minted on mount — "Connect site in Webflow" mints the authorize URL on the click, and the
 * consent screen is then an ordinary new-tab link (the extension opens no windows).
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
    state: { kind: "idle" },
    linkProps: null,
    onConnect: fn(),
    onSignOut: fn(),
  },
} satisfies Meta<typeof WebflowAuthorizeGateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Initial state: the explicit Connect action; no Tower request has been made. */
export const Idle: Story = {};

/** Minting the authorize URL from Tower after the click — disabled, busy primary action. */
export const Preparing: Story = {
  args: { state: { kind: "preparing" } },
};

/** Authorize URL minted: the primary action is a link to Webflow's consent screen. */
export const Ready: Story = {
  args: { state: { kind: "ready", url: readyLink.href, preparedAt: 0 }, linkProps: readyLink },
};

/** Tower declined (workspace-admin required): actionable message plus "Try again". */
export const ErrorTeamAdminRequired: Story = {
  args: { state: { kind: "error", error: "team_admin_required" } },
};

/** Tower unreachable: generic retry path. */
export const ErrorTowerUnreachable: Story = {
  args: { state: { kind: "error", error: "tower_unreachable" } },
};

/**
 * Tower declined because the session holds no active workspace. The gate's workspace step normally
 * runs first (`BeaconWorkspaceGateView`), so this is only reachable if the workspace was cleared
 * between the two.
 */
export const ErrorNoActiveWorkspace: Story = {
  args: { state: { kind: "error", error: "no_active_workspace" } },
};
