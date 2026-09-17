import type { Meta, StoryObj } from "@storybook/react-vite";
import { BeaconWorkspaceMenuGroup, BeaconWorkspaceSelectField } from "@/features/settings/ui/beacon-workspace-control";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

const ACME = { id: "org-acme", name: "Acme Web Team" };
const SIDE = { id: "org-side", name: "Side Projects" };

/**
 * Workspace controls for the Settings account panel (select field) and the app menu (menu group).
 * Review round 8 (2026-09-17): a user with exactly one workspace and none active sees it as a
 * default with an explicit confirmation — nothing is persisted to Tower until they act.
 */
const meta = {
  title: "Settings/WorkspaceControl",
  component: BeaconWorkspaceSelectField,
  args: {
    syncState: "synced",
    workspaces: [ACME],
    activeOrganizationId: null,
    onSelectWorkspace: () => {},
  },
  argTypes: { onSelectWorkspace: { action: "select workspace" } },
} satisfies Meta<typeof BeaconWorkspaceSelectField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One workspace, none active on the session: shown as the default with a confirm button. */
export const SingleWorkspaceUnconfirmed: Story = {};

/** One workspace, already active: static label, no action. */
export const SingleWorkspaceConfirmed: Story = {
  args: { activeOrganizationId: ACME.id },
};

/** Several workspaces: a select, none preselected until the user picks. */
export const MultipleWorkspaces: Story = {
  args: { workspaces: [ACME, SIDE], activeOrganizationId: null },
};

/** Several workspaces with one active. */
export const MultipleWorkspacesActive: Story = {
  args: { workspaces: [ACME, SIDE], activeOrganizationId: SIDE.id },
};

export const Syncing: Story = {
  args: { syncState: "loading" },
};

export const SyncError: Story = {
  args: { syncState: "error" },
};

export const NoWorkspace: Story = {
  args: { workspaces: [] },
};

function MenuFrame(props: React.ComponentProps<typeof BeaconWorkspaceMenuGroup>) {
  return (
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <button type="button" className="text-xs">
          Menu
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <BeaconWorkspaceMenuGroup {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** App-menu group, one workspace unconfirmed: hint plus a "Use this workspace" item. */
export const MenuSingleWorkspaceUnconfirmed: Story = {
  render: (args) => <MenuFrame {...args} />,
};

/** App-menu group, one workspace confirmed: static label. */
export const MenuSingleWorkspaceConfirmed: Story = {
  args: { activeOrganizationId: ACME.id },
  render: (args) => <MenuFrame {...args} />,
};

/** App-menu group with a radio switcher for several workspaces. */
export const MenuMultipleWorkspaces: Story = {
  args: { workspaces: [ACME, SIDE], activeOrganizationId: ACME.id },
  render: (args) => <MenuFrame {...args} />,
};
