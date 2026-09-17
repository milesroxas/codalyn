import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: {} }));
vi.mock("@/server/access/early-access", () => ({
  emailMayRegister: vi.fn(),
  grantEarlyAccess: vi.fn(),
  userMaySignIn: vi.fn(),
}));
vi.mock("@/server/access/early-access-feature", () => ({ isTowerEarlyAccessGateEnabled: () => false }));

import { mustRevokeCredentialBeforeDesignerLink } from "@/server/webflow-designer-session-logic";

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
