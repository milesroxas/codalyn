// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BeaconWorkspaceSelectField, SINGLE_WORKSPACE_CONFIRM_LABEL } from "./beacon-workspace-control";

const ACME = { id: "org-acme", name: "Acme Web Team" };

/**
 * Review round 8 (2026-09-17): a single-workspace default is never persisted on its own. The control
 * shows it and asks for an explicit confirmation; only that click calls `onSelectWorkspace`.
 */
describe("BeaconWorkspaceSelectField — single workspace", () => {
  it("offers the one workspace as a default and calls onSelectWorkspace only on the confirm click", async () => {
    const onSelectWorkspace = vi.fn();
    render(
      <BeaconWorkspaceSelectField
        syncState="synced"
        workspaces={[ACME]}
        activeOrganizationId={null}
        onSelectWorkspace={onSelectWorkspace}
      />
    );

    expect(screen.getByText(ACME.name)).toBeInTheDocument();
    expect(onSelectWorkspace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL }));
    expect(onSelectWorkspace).toHaveBeenCalledTimes(1);
    expect(onSelectWorkspace).toHaveBeenCalledWith(ACME.id);
  });

  it("shows a static label once that workspace is active on the session", () => {
    const onSelectWorkspace = vi.fn();
    render(
      <BeaconWorkspaceSelectField
        syncState="synced"
        workspaces={[ACME]}
        activeOrganizationId={ACME.id}
        onSelectWorkspace={onSelectWorkspace}
      />
    );
    expect(screen.getByText(ACME.name)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL })).toBeNull();
    expect(onSelectWorkspace).not.toHaveBeenCalled();
  });

  it("renders no confirm affordance while syncing, on error, or with no workspace", () => {
    for (const props of [
      { syncState: "loading" as const, workspaces: [ACME] },
      { syncState: "error" as const, workspaces: [ACME] },
      { syncState: "synced" as const, workspaces: [] },
    ]) {
      const { unmount } = render(
        <BeaconWorkspaceSelectField {...props} activeOrganizationId={null} onSelectWorkspace={vi.fn()} />
      );
      expect(screen.queryByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL })).toBeNull();
      unmount();
    }
  });
});
