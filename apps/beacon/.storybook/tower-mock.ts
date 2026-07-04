/**
 * MSW request handlers that impersonate Tower for Storybook.
 *
 * `__BEACON_TOWER_ORIGIN__` is baked to this fake origin (see `vite.config.ts`), so the real
 * `BeaconAppSettingsProvider` / Better Auth session hooks run unmodified and MSW answers their
 * requests. Each persona is one coherent Tower state: the session endpoint, the settings
 * envelope, and the bearer token seeded into localStorage all agree.
 *
 * Personas deliberately omit `settings` from the envelope: `applyTowerBeaconEnvelope` only
 * overwrites settings when the field is present, so the locally seeded settings (which follow
 * the Storybook theme toolbar — see `beacon-app.tsx`) stay authoritative.
 */
import { HttpResponse, http, type RequestHandler } from "msw";

export const TOWER_MOCK_ORIGIN = "https://tower.mock";

const towerUrl = (path: string) => `${TOWER_MOCK_ORIGIN}${path}`;

export type TowerPersonaName = "guest" | "freeUser" | "teamEditor" | "teamAdmin";

type TowerPersonaUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

/** Mirrors the provider-private `TowerBeaconApiEnvelope` (minus `settings`, see module docs). */
type TowerPersonaEnvelope = {
  editorExperience: boolean;
  canManageTeamBeaconSettings: boolean;
  restrictToEditorExperience: boolean;
  workspaceMemberRole: string | null;
  appUserRole: string | null;
  hasActiveWorkspace: boolean;
  workspaces: Array<{ id: string; name: string }>;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  webflowSites: Array<{ id: string; displayName?: string; shortName?: string }> | null;
};

type TowerPersona = {
  /** Seeded into localStorage so `towerFetch`/Better Auth send a bearer token. Absent = guest. */
  sessionToken?: string;
  user?: TowerPersonaUser;
  envelope?: TowerPersonaEnvelope;
};

const ACME_WORKSPACE = { id: "org-acme", name: "Acme Web Team" };
const SIDE_WORKSPACE = { id: "org-side", name: "Side Projects" };

/** Matches the fake Designer site (`.storybook/webflow-fixtures.ts`) so the site-link gate passes. */
const AUTHORIZED_SITES = [{ id: "site-marketing", displayName: "Acme Marketing", shortName: "acme-marketing" }];

export const TOWER_PERSONAS: Record<TowerPersonaName, TowerPersona> = {
  guest: {},
  freeUser: {
    sessionToken: "storybook-token-free-user",
    user: { id: "user-free", email: "solo@studio.dev", name: "Sol Freelancer" },
    envelope: {
      editorExperience: false,
      canManageTeamBeaconSettings: false,
      restrictToEditorExperience: false,
      workspaceMemberRole: null,
      appUserRole: null,
      hasActiveWorkspace: false,
      workspaces: [],
      activeOrganizationId: null,
      activeOrganizationName: null,
      webflowSites: null,
    },
  },
  teamEditor: {
    sessionToken: "storybook-token-team-editor",
    user: { id: "user-editor", email: "eddie@acme.dev", name: "Eddie Editor" },
    envelope: {
      editorExperience: true,
      canManageTeamBeaconSettings: false,
      restrictToEditorExperience: false,
      workspaceMemberRole: "editor",
      appUserRole: null,
      hasActiveWorkspace: true,
      workspaces: [ACME_WORKSPACE, SIDE_WORKSPACE],
      activeOrganizationId: ACME_WORKSPACE.id,
      activeOrganizationName: ACME_WORKSPACE.name,
      webflowSites: AUTHORIZED_SITES,
    },
  },
  teamAdmin: {
    sessionToken: "storybook-token-team-admin",
    user: { id: "user-admin", email: "ada@acme.dev", name: "Ada Admin" },
    envelope: {
      editorExperience: false,
      canManageTeamBeaconSettings: true,
      restrictToEditorExperience: false,
      workspaceMemberRole: "admin",
      appUserRole: null,
      hasActiveWorkspace: true,
      workspaces: [ACME_WORKSPACE, SIDE_WORKSPACE],
      activeOrganizationId: ACME_WORKSPACE.id,
      activeOrganizationName: ACME_WORKSPACE.name,
      webflowSites: AUTHORIZED_SITES,
    },
  },
};

/** Better Auth `get-session` payload for a signed-in persona. */
function sessionPayload(persona: TowerPersona) {
  if (!persona.user || !persona.sessionToken) {
    return null;
  }
  return {
    session: {
      id: `session-${persona.user.id}`,
      token: persona.sessionToken,
      userId: persona.user.id,
      activeOrganizationId: persona.envelope?.activeOrganizationId ?? null,
      expiresAt: "2099-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    user: { ...persona.user, emailVerified: true },
  };
}

export function towerHandlers(name: TowerPersonaName): RequestHandler[] {
  const persona = TOWER_PERSONAS[name];
  return [
    http.get(towerUrl("/api/auth/get-session"), () => HttpResponse.json(sessionPayload(persona))),
    // Designer id-token exchange is meaningless in Storybook; reject so the session hook
    // settles instead of retrying (personas sign in via the seeded bearer token).
    http.post(towerUrl("/api/auth/webflow-designer"), () =>
      HttpResponse.json({ error: "storybook: designer exchange disabled" }, { status: 401 })
    ),
    http.get(towerUrl("/api/v1/beacon/settings"), () =>
      persona.envelope
        ? HttpResponse.json(persona.envelope)
        : HttpResponse.json({ error: "unauthorized" }, { status: 401 })
    ),
    // Ack without echoing `settings` back: the provider keeps its optimistic local merge and
    // flips to "synced", which is exactly the state the story should show.
    http.put(towerUrl("/api/v1/beacon/settings"), () =>
      persona.envelope
        ? HttpResponse.json(persona.envelope)
        : HttpResponse.json({ error: "unauthorized" }, { status: 401 })
    ),
    http.post(towerUrl("/api/v1/beacon/active-workspace"), () => HttpResponse.json({ ok: true })),
    http.get(towerUrl("/api/account/access-policy"), () => HttpResponse.json({ earlyAccessRequired: false })),
    // Anything not mocked above (billing, usage, CMS proxy…) gets a deterministic 404 so
    // components exercise their error/empty paths instead of hanging on a dead origin.
    http.all(`${TOWER_MOCK_ORIGIN}/*`, () => HttpResponse.json({ error: "not mocked in storybook" }, { status: 404 })),
  ];
}
