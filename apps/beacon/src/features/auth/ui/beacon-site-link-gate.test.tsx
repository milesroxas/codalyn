// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SINGLE_WORKSPACE_CONFIRM_LABEL } from "@/features/settings/ui/beacon-workspace-control";
import { BeaconSiteLinkGuard } from "./beacon-site-link-gate";

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
const mintAuthorizeMock = vi.fn(async () => ({ ok: false as const, error: "tower_unreachable" }));
vi.mock("@/features/auth/model/tower-auth-client", () => ({
  TOWER_APP_ENTRY_PATH: "/auth/continue",
  getTowerAuthBaseUrl: () => "https://tower.example.test",
  isTowerConfigured: () => true,
  mintTowerHandoffToken: () => mintHandoffMock(),
  mintWebflowAuthorizeUrl: () => mintAuthorizeMock(),
}));

// `useTowerAppLink` only mints while a Tower bearer is held; the gate is a signed-in surface.
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
 * direct user interaction, not fired on load. The workspace step therefore issues no Tower request
 * on mount: the session-handoff token behind the "Open Tower" link is minted only on the
 * zero-workspace screen that renders that link, and the consent URL only once a workspace is active.
 */
describe("BeaconSiteLinkGuard — workspace step", () => {
  it("single workspace: confirmation screen, no Tower request on mount", async () => {
    settingsState = { beaconWorkspaces: [ACME], hasActiveWorkspace: false, webflowSites: null };
    renderGuard();

    expect(await screen.findByRole("heading", { name: "Confirm your workspace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: SINGLE_WORKSPACE_CONFIRM_LABEL })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /open tower/i })).toBeNull();
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
    expect(screen.queryByRole("link", { name: /open tower/i })).toBeNull();
    await Promise.resolve();
    expect(mintHandoffMock).not.toHaveBeenCalled();
    expect(mintAuthorizeMock).not.toHaveBeenCalled();
  });

  it("no workspace: Tower new-tab link (handoff token in the fragment), consent URL never minted", async () => {
    settingsState = { beaconWorkspaces: [], hasActiveWorkspace: false, webflowSites: null };
    renderGuard();

    expect(await screen.findByRole("heading", { name: "No Tower workspace yet" })).toBeTruthy();
    const link = screen.getByRole("link", { name: /open tower/i });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    await waitFor(() => {
      expect(link.getAttribute("href")).toBe(
        "https://tower.example.test/beacon-handoff#ott=ott-1&callbackUrl=%2Fauth%2Fcontinue"
      );
    });
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

  it("workspace active, site outside the grant: consent link is prepared (explicit re-authorization)", async () => {
    settingsState = { beaconWorkspaces: [ACME], hasActiveWorkspace: true, webflowSites: [] };
    renderGuard();

    expect(await screen.findByText(/Authorize/)).toBeTruthy();
    await waitFor(() => {
      expect(mintAuthorizeMock).toHaveBeenCalledTimes(1);
    });
    expect(mintHandoffMock).not.toHaveBeenCalled();
    expect(screen.queryByText("route content")).toBeNull();
  });
});
