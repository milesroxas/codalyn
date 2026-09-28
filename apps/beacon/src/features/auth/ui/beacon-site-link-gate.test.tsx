// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SINGLE_WORKSPACE_CONFIRM_LABEL } from "@/features/settings/ui/beacon-workspace-control";
import { BeaconSiteLinkGuard } from "./beacon-site-link-gate";
import { TOWER_CONTINUE_LABEL, TOWER_OPEN_LABEL } from "./beacon-workspace-gate-view";
import { WEBFLOW_AUTHORIZE_CONNECT_LABEL, WEBFLOW_AUTHORIZE_OPEN_LABEL } from "./webflow-authorize-gate-view";

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
const SITE = { siteId: "site-demo", siteName: "Beacon Demo", shortName: "beacon-demo" };

const mintHandoffMock = vi.fn(async (): Promise<string | null> => "ott-1");
const mintAuthorizeMock = vi.fn<() => Promise<{ ok: true; url: string } | { ok: false; error: string }>>(async () => ({
  ok: true,
  url: "https://webflow.com/oauth/authorize?state=abc",
}));
vi.mock("@/features/auth/model/tower-auth-client", () => ({
  TOWER_APP_ENTRY_PATH: "/auth/continue",
  getTowerAuthBaseUrl: () => "https://tower.example.test",
  isTowerConfigured: () => true,
  mintTowerHandoffToken: () => mintHandoffMock(),
  mintWebflowAuthorizeUrl: () => mintAuthorizeMock(),
}));

// The Tower handoff is only minted while a Tower bearer is held; the gate is a signed-in surface.
vi.mock("@/features/auth/lib/beacon-tower-session-token", () => ({
  readBeaconTowerSessionToken: () => "tower-bearer",
  writeBeaconTowerSessionToken: vi.fn(),
  clearBeaconTowerSessionToken: vi.fn(),
}));

const clearStoredSessionMock = vi.fn();
vi.mock("@/features/auth/model/use-beacon-tower-session", () => ({
  useBeaconTowerSession: () => ({
    user: { id: "user-1", email: "designer@example.test" },
    isPending: false,
    refetch: vi.fn(),
    clearStoredSession: clearStoredSessionMock,
    signInWithEmail: vi.fn(),
    signInWithWebflow: vi.fn(),
  }),
}));

vi.mock("@/features/auth/lib/use-beacon-current-site", () => ({
  useBeaconCurrentSite: () => ({ site: SITE, ready: true }),
}));

type SettingsState = {
  beaconWorkspaces: Array<{ id: string; name: string }>;
  hasActiveWorkspace: boolean;
  webflowSites: Array<{ id: string; name: string }> | null;
};
let settingsState: SettingsState;
const refreshMock = vi.fn();
const setActiveWorkspaceMock = vi.fn(async () => ({ ok: true }));
vi.mock("@/features/settings/model/beacon-app-settings-provider", () => ({
  useBeaconAppSettings: () => ({
    ...settingsState,
    settingsPullPending: false,
    settingsPullSynced: true,
    refreshBeaconSettings: refreshMock,
    setActiveBeaconWorkspace: setActiveWorkspaceMock,
  }),
}));

function renderGuard() {
  return render(
    <BeaconSiteLinkGuard>
      <p>route content</p>
    </BeaconSiteLinkGuard>
  );
}

beforeEach(() => {
  mintHandoffMock.mockClear();
  mintAuthorizeMock.mockClear();
  refreshMock.mockClear();
  setActiveWorkspaceMock.mockClear();
});

/**
 * Marketplace guidelines, "User interaction": every state-changing action must be traceable to a
 * direct user interaction, not fired on load. No screen of the gate issues a Tower request on mount:
 * the session-handoff token behind "Open Tower" and the OAuth state behind the consent link are both
 * minted by the user's click on the corresponding control (review round 9, 2026-09-28), and the minted
 * destination then opens as a plain new-tab anchor.
 */
describe("BeaconSiteLinkGuard — workspace step", () => {
  it("single workspace: confirmation screen, no Tower request on mount", async () => {
    settingsState = { beaconWorkspaces: [ACME], hasActiveWorkspace: false, webflowSites: null };
    renderGuard();

    expect(await screen.findByRole("heading", { name: "Confirm your workspace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL })).toBeTruthy();
    expect(screen.queryByRole("button", { name: TOWER_OPEN_LABEL })).toBeNull();
    expect(screen.queryByText("route content")).toBeNull();
    // Let any mount effects flush before asserting nothing was minted.
    await Promise.resolve();
    expect(mintHandoffMock).not.toHaveBeenCalled();
    expect(mintAuthorizeMock).not.toHaveBeenCalled();
    expect(setActiveWorkspaceMock).not.toHaveBeenCalled();
  });

  it("several workspaces: pick list, no Tower request on mount", async () => {
    settingsState = { beaconWorkspaces: [ACME, NORTH], hasActiveWorkspace: false, webflowSites: null };
    renderGuard();

    expect(await screen.findByRole("heading", { name: "Choose a workspace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: ACME.name })).toBeTruthy();
    expect(screen.getByRole("button", { name: NORTH.name })).toBeTruthy();
    expect(screen.queryByRole("button", { name: TOWER_OPEN_LABEL })).toBeNull();
    await Promise.resolve();
    expect(mintHandoffMock).not.toHaveBeenCalled();
    expect(mintAuthorizeMock).not.toHaveBeenCalled();
  });

  it("no workspace: nothing minted on mount; the Open Tower click mints once, then a new-tab anchor (token in the fragment)", async () => {
    settingsState = { beaconWorkspaces: [], hasActiveWorkspace: false, webflowSites: null };
    renderGuard();

    expect(await screen.findByRole("heading", { name: "No Tower workspace yet" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    await Promise.resolve();
    expect(mintHandoffMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: TOWER_OPEN_LABEL }));
    const link = await screen.findByRole("link", { name: TOWER_CONTINUE_LABEL });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("href")).toBe(
      "https://tower.example.test/beacon-handoff#ott=ott-1&callbackUrl=%2Fauth%2Fcontinue"
    );
    expect(link.getAttribute("href")).not.toMatch(/[?&]ott=/);
    expect(mintHandoffMock).toHaveBeenCalledTimes(1);
    expect(mintAuthorizeMock).not.toHaveBeenCalled();
  });

  it("workspace active, site in the grant: routes render, nothing minted", async () => {
    settingsState = {
      beaconWorkspaces: [ACME],
      hasActiveWorkspace: true,
      webflowSites: [{ id: SITE.siteId, name: "x" }],
    };
    renderGuard();

    expect(await screen.findByText("route content")).toBeTruthy();
    expect(mintHandoffMock).not.toHaveBeenCalled();
    expect(mintAuthorizeMock).not.toHaveBeenCalled();
  });

  it("workspace active, site outside the grant: no OAuth state on mount; the Connect click mints once, then the consent anchor", async () => {
    settingsState = { beaconWorkspaces: [ACME], hasActiveWorkspace: true, webflowSites: [] };
    renderGuard();

    expect(await screen.findByRole("heading", { name: "Authorize this site in Webflow" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    await Promise.resolve();
    expect(mintAuthorizeMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: WEBFLOW_AUTHORIZE_CONNECT_LABEL }));
    const link = await screen.findByRole("link", { name: WEBFLOW_AUTHORIZE_OPEN_LABEL });
    expect(link.getAttribute("href")).toBe("https://webflow.com/oauth/authorize?state=abc");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(mintAuthorizeMock).toHaveBeenCalledTimes(1);
    expect(mintHandoffMock).not.toHaveBeenCalled();
    expect(screen.queryByText("route content")).toBeNull();
  });

  it("workspace active, site outside the grant: a refused mint shows the reason and a retry, no anchor", async () => {
    settingsState = { beaconWorkspaces: [ACME], hasActiveWorkspace: true, webflowSites: [] };
    mintAuthorizeMock.mockResolvedValueOnce({ ok: false, error: "team_admin_required" });
    renderGuard();

    await userEvent.click(await screen.findByRole("button", { name: WEBFLOW_AUTHORIZE_CONNECT_LABEL }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/workspace admin/);
    });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(mintAuthorizeMock).toHaveBeenCalledTimes(1);
  });
});
