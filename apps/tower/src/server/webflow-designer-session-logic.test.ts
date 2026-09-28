import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: {} }));
vi.mock("@/server/access/early-access", () => ({
  emailMayRegister: vi.fn(),
  grantEarlyAccess: vi.fn(),
  userMaySignIn: vi.fn(),
}));
vi.mock("@/server/access/early-access-feature", () => ({ isTowerEarlyAccessGateEnabled: () => false }));
vi.mock("@/server/webflow-designer-identity", () => ({
  bindWebflowUserToTowerUser: vi.fn(),
  chooseBoundTowerUser: vi.fn(),
  findInstallTimeAuthorizationUser: vi.fn(),
  listTowerUsersBoundToWebflowUser: vi.fn(),
  userHoldsAuthorizationForSite: vi.fn(),
}));

import {
  mustRevokeCredentialBeforeDesignerLink,
  readDesignerExchangeIntent,
} from "@/server/webflow-designer-session-logic";

/**
 * Review round 9 (2026-09-28): the extension's silent run only restores an associated account; older
 * builds send no intent and keep the full sign-in behaviour, so absence never means "restore".
 */
describe("readDesignerExchangeIntent", () => {
  it("restores only on the exact string", () => {
    expect(readDesignerExchangeIntent("restore")).toBe("restore");
  });

  it("treats everything else — including no value — as the explicit sign-in", () => {
    expect(readDesignerExchangeIntent("sign_in")).toBe("sign_in");
    expect(readDesignerExchangeIntent(undefined)).toBe("sign_in");
    expect(readDesignerExchangeIntent(null)).toBe("sign_in");
    expect(readDesignerExchangeIntent("RESTORE")).toBe("sign_in");
    expect(readDesignerExchangeIntent({ value: "restore" })).toBe("sign_in");
  });
});

describe("mustRevokeCredentialBeforeDesignerLink (account pre-hijack guard)", () => {
  it("revokes a password minted on an account whose email was never verified", () => {
    expect(mustRevokeCredentialBeforeDesignerLink({ emailVerified: false, hasCredentialAccount: true })).toBe(true);
  });

  it("leaves a verified account's password alone — the owner proved the inbox", () => {
    expect(mustRevokeCredentialBeforeDesignerLink({ emailVerified: true, hasCredentialAccount: true })).toBe(false);
  });

  it("has nothing to revoke on an account with no password (Designer-provisioned or invite-created)", () => {
    expect(mustRevokeCredentialBeforeDesignerLink({ emailVerified: false, hasCredentialAccount: false })).toBe(false);
    expect(mustRevokeCredentialBeforeDesignerLink({ emailVerified: true, hasCredentialAccount: false })).toBe(false);
  });
});
