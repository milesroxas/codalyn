// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SINGLE_WORKSPACE_CONFIRM_LABEL } from "@/features/settings/ui/beacon-workspace-control";
import { BeaconWorkspaceGateView } from "./beacon-workspace-gate-view";

// Radix ScrollArea observes its viewport; jsdom ships no ResizeObserver.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

const ACME = { id: "org-acme", name: "Acme Web Team" };
const NORTH = { id: "org-north", name: "Northwind Studio" };

const towerLink = {
  href: "https://tower.example.test/auth/continue",
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
  onPointerEnter: vi.fn(),
  onFocus: vi.fn(),
  onClick: vi.fn(),
};

function renderView(overrides: Partial<Parameters<typeof BeaconWorkspaceGateView>[0]> = {}) {
  const onSelectWorkspace = vi.fn();
  const onCheckAgain = vi.fn();
  const onSignOut = vi.fn();
  render(
    <BeaconWorkspaceGateView
      siteLabel="Beacon Demo"
      workspaces={[ACME]}
      selectingId={null}
      selectFailed={false}
      towerLinkProps={towerLink}
      onSelectWorkspace={onSelectWorkspace}
      onCheckAgain={onCheckAgain}
      onSignOut={onSignOut}
      {...overrides}
    />
  );
  return { onSelectWorkspace, onCheckAgain, onSignOut };
}

/**
 * Review round 8 (2026-09-17): the workspace is never persisted on its own. The gate shows it and
 * asks for an explicit confirmation; only that click calls `onSelectWorkspace`.
 */
describe("BeaconWorkspaceGateView", () => {
  it("offers the only workspace as a default and calls onSelectWorkspace only on the confirm click", async () => {
    const { onSelectWorkspace } = renderView();
    expect(screen.getByText(ACME.name)).toBeInTheDocument();
    expect(onSelectWorkspace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL }));
    expect(onSelectWorkspace).toHaveBeenCalledTimes(1);
    expect(onSelectWorkspace).toHaveBeenCalledWith(ACME.id);
  });

  it("lists several workspaces and reports the picked one by id", async () => {
    const { onSelectWorkspace } = renderView({ workspaces: [ACME, NORTH] });
    expect(screen.queryByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: NORTH.name }));
    expect(onSelectWorkspace).toHaveBeenCalledWith(NORTH.id);
  });

  it("disables every pick while a confirmation is in flight", () => {
    renderView({ workspaces: [ACME, NORTH], selectingId: NORTH.id });
    expect(screen.getByRole("button", { name: ACME.name })).toBeDisabled();
    expect(screen.getByRole("button", { name: NORTH.name })).toBeDisabled();
  });

  it("with no workspace, links to Tower as a new-tab anchor and offers a re-check", async () => {
    const { onSelectWorkspace, onCheckAgain } = renderView({ workspaces: [] });
    const link = screen.getByRole("link", { name: /Open Tower/ });
    expect(link).toHaveAttribute("href", towerLink.href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    await userEvent.click(screen.getByRole("button", { name: /Check again/ }));
    expect(onCheckAgain).toHaveBeenCalledTimes(1);
    expect(onSelectWorkspace).not.toHaveBeenCalled();
  });

  it("omits the Tower link when no Tower origin is configured", () => {
    renderView({ workspaces: [], towerLinkProps: null });
    expect(screen.queryByRole("link", { name: /Open Tower/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Check again/ })).toBeInTheDocument();
  });

  it("shows the failure line and keeps the controls usable after a refused confirmation", () => {
    renderView({ selectFailed: true });
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn't set the workspace/);
    expect(screen.getByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL })).toBeEnabled();
  });

  it("always offers sign-out", async () => {
    const { onSignOut } = renderView({ workspaces: [] });
    await userEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
