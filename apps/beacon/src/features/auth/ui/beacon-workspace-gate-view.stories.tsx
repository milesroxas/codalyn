import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BeaconWorkspaceGateView } from "@/features/auth/ui/beacon-workspace-gate-view";

const towerLink = {
  href: "https://tower.example.test/auth/continue",
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
  onPointerEnter: fn(),
  onFocus: fn(),
  onClick: fn(),
};

const ACME = { id: "org-acme", name: "Acme Web Team" };
const NORTH = { id: "org-north", name: "Northwind Studio" };
const ORBIT = { id: "org-orbit", name: "Orbit Agency" };

/**
 * Workspace step of the site gate: a signed-in Designer session with no active Tower workspace.
 * Nothing persists until the user clicks (review round 8); with no workspace, Tower opens as a
 * new-tab link.
 */
const meta = {
  title: "Auth/BeaconWorkspaceGateView",
  component: BeaconWorkspaceGateView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex h-[28rem] flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    siteLabel: "Beacon Demo",
    workspaces: [ACME],
    selectingId: null,
    selectFailed: false,
    towerLinkProps: towerLink,
    onSelectWorkspace: fn(),
    onCheckAgain: fn(),
    onSignOut: fn(),
  },
} satisfies Meta<typeof BeaconWorkspaceGateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One workspace: shown as the default with an explicit "Use this workspace" confirmation. */
export const SingleWorkspace: Story = {};

/** Confirmation in flight: the control is disabled and busy until Tower answers. */
export const SingleWorkspaceSelecting: Story = {
  args: { selectingId: ACME.id },
};

/** Several workspaces: each is a pick; the selected one shows busy while it persists. */
export const MultipleWorkspaces: Story = {
  args: { workspaces: [ACME, NORTH, ORBIT] },
};

/** Tower refused the confirmation (or was unreachable): inline error, controls re-enabled. */
export const SelectFailed: Story = {
  args: { workspaces: [ACME, NORTH], selectFailed: true },
};

/** No workspace at all: Tower link plus "Check again" after creating or joining one there. */
export const NoWorkspace: Story = {
  args: { workspaces: [] },
};

/** No workspace and no Tower origin in this build: only "Check again" and sign-out remain. */
export const NoWorkspaceTowerUnavailable: Story = {
  args: { workspaces: [], towerLinkProps: null },
};
