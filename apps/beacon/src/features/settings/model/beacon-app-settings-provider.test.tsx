// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const towerFetchMock = vi.hoisted(() => vi.fn());
const sessionUser = vi.hoisted(() => ({
  value: { id: "user-1", email: "u@example.test" } as { id: string; email: string } | null,
}));

vi.mock("@/shared/lib/tower-client", () => ({
  getTowerOrigin: () => "https://tower.test",
  towerFetch: (path: string, init?: RequestInit) => towerFetchMock(path, init),
  towerFetchWithRetry: (path: string, init?: RequestInit) => towerFetchMock(path, init),
}));

vi.mock("@/features/auth/model/use-beacon-tower-session", () => ({
  useBeaconTowerSession: () => ({ user: sessionUser.value, isPending: false }),
}));

import { BeaconAppSettingsProvider, useBeaconAppSettings } from "./beacon-app-settings-provider";

const ACME = { id: "org-acme", name: "Acme Web Team" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Tower `GET /api/v1/beacon/settings` envelope for a user with one workspace and none active on the session. */
function envelope(activeOrganizationId: string | null) {
  return {
    settings: {},
    editorExperience: false,
    canManageTeamBeaconSettings: false,
    restrictToEditorExperience: false,
    workspaceMemberRole: null,
    appUserRole: null,
    hasActiveWorkspace: Boolean(activeOrganizationId),
    workspaces: [ACME],
    activeOrganizationId,
    activeOrganizationName: activeOrganizationId ? ACME.name : null,
    webflowSites: null,
  };
}

function Probe() {
  const { syncState, suggestedWorkspaceId, activeOrganizationId, setActiveBeaconWorkspace } = useBeaconAppSettings();
  return (
    <div>
      <output data-testid="sync">{syncState}</output>
      <output data-testid="suggested">{suggestedWorkspaceId ?? "none"}</output>
      <output data-testid="active">{activeOrganizationId ?? "none"}</output>
      <button type="button" onClick={() => setActiveBeaconWorkspace(ACME.id)}>
        confirm
      </button>
    </div>
  );
}

function activeWorkspaceCalls() {
  return towerFetchMock.mock.calls.filter(([path]) => String(path).includes("/api/v1/beacon/active-workspace"));
}

/**
 * Review round 8 (2026-09-17, "Workspace state persisted without explicit user interaction"): when
 * settings sync returns exactly one workspace and none active, the provider must NOT POST to
 * /api/v1/beacon/active-workspace on its own. It holds the default locally (`suggestedWorkspaceId`)
 * and persists only when the user confirms through `setActiveBeaconWorkspace`.
 */
describe("BeaconAppSettingsProvider — single-workspace default", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionUser.value = { id: "user-1", email: "u@example.test" };
    let activeId: string | null = null;
    towerFetchMock.mockReset().mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/beacon/settings" && (!init?.method || init.method === "GET")) {
        return json(envelope(activeId));
      }
      if (path === "/api/v1/beacon/active-workspace" && init?.method === "POST") {
        activeId = (JSON.parse(String(init.body)) as { organizationId: string }).organizationId;
        return json({ ok: true });
      }
      return json({ error: "unexpected" }, 500);
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not persist the only workspace without user interaction; exposes it as a suggestion", async () => {
    render(
      <BeaconAppSettingsProvider>
        <Probe />
      </BeaconAppSettingsProvider>
    );

    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("synced"));
    // Give any (removed) effect a turn to fire.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(activeWorkspaceCalls()).toHaveLength(0);
    expect(screen.getByTestId("suggested")).toHaveTextContent(ACME.id);
    expect(screen.getByTestId("active")).toHaveTextContent("none");
  });

  it("persists the workspace only on an explicit confirmation, then refetches settings", async () => {
    render(
      <BeaconAppSettingsProvider>
        <Probe />
      </BeaconAppSettingsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("synced"));

    await userEvent.click(screen.getByRole("button", { name: "confirm" }));

    await waitFor(() => expect(activeWorkspaceCalls()).toHaveLength(1));
    const [, init] = activeWorkspaceCalls()[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ organizationId: ACME.id });

    await waitFor(() => expect(screen.getByTestId("active")).toHaveTextContent(ACME.id));
    expect(screen.getByTestId("suggested")).toHaveTextContent("none");
  });

  it("offers no suggestion when signed out or when a workspace is already active", async () => {
    sessionUser.value = null;
    const { unmount } = render(
      <BeaconAppSettingsProvider>
        <Probe />
      </BeaconAppSettingsProvider>
    );
    expect(screen.getByTestId("suggested")).toHaveTextContent("none");
    expect(towerFetchMock).not.toHaveBeenCalled();
    unmount();

    sessionUser.value = { id: "user-1", email: "u@example.test" };
    towerFetchMock.mockImplementation(async () => json(envelope(ACME.id)));
    render(
      <BeaconAppSettingsProvider>
        <Probe />
      </BeaconAppSettingsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("synced"));
    expect(screen.getByTestId("suggested")).toHaveTextContent("none");
    expect(screen.getByTestId("active")).toHaveTextContent(ACME.id);
    expect(activeWorkspaceCalls()).toHaveLength(0);
  });
});
