import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PreparedExternalLinkAction } from "@/features/auth/ui/prepared-external-link-action";

const readyLink = {
  href: "https://webflow.com/oauth/authorize?client_id=demo&state=demo",
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
  onPointerEnter: fn(),
  onFocus: fn(),
  onClick: fn(),
};

/**
 * One control for a destination Tower mints on the user's click: idle button → busy → new-tab anchor,
 * or a retry after a failed mint. Used by the site-authorization gate (consent link) and the
 * zero-workspace gate (Tower handoff link).
 */
const meta = {
  title: "Auth/PreparedExternalLinkAction",
  component: PreparedExternalLinkAction,
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  args: {
    state: { kind: "idle" },
    linkProps: null,
    onPrepare: fn(),
    labels: {
      prepare: "Connect site in Webflow",
      preparing: "Preparing Webflow authorization…",
      open: "Open Webflow authorization",
    },
  },
} satisfies Meta<typeof PreparedExternalLinkAction>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing requested yet: the click mints the destination. */
export const Idle: Story = {};

/** Tower is minting the destination. */
export const Preparing: Story = {
  args: { state: { kind: "preparing" } },
};

/** Minted: an ordinary new-tab anchor. */
export const Ready: Story = {
  args: { state: { kind: "ready", url: readyLink.href, preparedAt: 0 }, linkProps: readyLink },
};

/** Tower declined: actionable line plus retry. */
export const Failed: Story = {
  args: {
    state: { kind: "error", error: "team_admin_required" },
    messageForError: () => "Only a workspace admin can authorize sites in Webflow.",
  },
};
