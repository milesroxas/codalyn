import type { Meta, StoryObj } from "@storybook/react-vite";
import Header from "@/app/ui/Header";
import { beaconScreen } from "~sb/beacon-app";

/**
 * The app chrome bar: logo, up-navigation, and the account/workspace menu. All state comes from
 * context (Tower session, settings, route), so each story is a persona from `beaconScreen()`.
 */
const meta = {
  title: "App/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
    ...beaconScreen("guest"),
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed out: menu offers sign-in; no workspace group. */
export const Guest: Story = {};

/** Signed in without a team workspace: profile row, no workspace switcher. */
export const SignedInFree: Story = {
  parameters: beaconScreen("freeUser"),
};

/** Team admin with two workspaces: switcher and Tower shortcuts in the menu. */
export const TeamAdmin: Story = {
  parameters: beaconScreen("teamAdmin"),
};

/** Editor-experience member: reduced menu per the editor policy. */
export const TeamEditor: Story = {
  parameters: beaconScreen("teamEditor"),
};

/** On a feature route (not Home): the up-navigation control appears with the parent label. */
export const OnImagesRoute: Story = {
  parameters: beaconScreen("teamAdmin", { route: "/images" }),
};

/**
 * Menu open (Help group visible): Documentation opens the public docs in a new tab, alongside the
 * feedback / support form actions.
 */
export const MenuOpenHelp: Story = {
  parameters: beaconScreen("freeUser"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /menu/i }));
  },
};
