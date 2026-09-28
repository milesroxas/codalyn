import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: {} }));
vi.mock("@/server/security/secret-encryption", () => ({ decryptStoredSecret: (v: string) => v }));
vi.mock("@/server/webflow-organization-sites", () => ({ listOrganizationIdsLinkedToWebflowSite: vi.fn() }));
vi.mock("@/server/webflow-token-identity", () => ({ fetchWebflowAuthorizedUserId: vi.fn() }));

import { chooseBoundTowerUser, chooseInstallerForOrganization } from "@/server/webflow-designer-identity";

const T0 = new Date("2026-09-01T00:00:00Z");
const T1 = new Date("2026-09-20T00:00:00Z");

/**
 * Review round 9 (2026-09-28): the Designer identity lands in the Tower account associated with the
 * Webflow user id — the Designer link or the install-time authorization — never in one picked by e-mail.
 */
describe("chooseBoundTowerUser", () => {
  it("returns null with no candidates and the only candidate otherwise", () => {
    expect(chooseBoundTowerUser([])).toBeNull();
    expect(chooseBoundTowerUser([{ userId: "u1", boundAt: T0, holdsAuthorizationForSite: false }])).toBe("u1");
  });

  it("prefers the account holding an authorization for the site open in the Designer", () => {
    expect(
      chooseBoundTowerUser([
        { userId: "auto-provisioned", boundAt: T1, holdsAuthorizationForSite: false },
        { userId: "installer", boundAt: T0, holdsAuthorizationForSite: true },
      ])
    ).toBe("installer");
  });

  it("falls back to the most recent link when none holds an authorization for the site", () => {
    expect(
      chooseBoundTowerUser([
        { userId: "older", boundAt: T0, holdsAuthorizationForSite: false },
        { userId: "newer", boundAt: T1, holdsAuthorizationForSite: false },
      ])
    ).toBe("newer");
  });
});

describe("chooseInstallerForOrganization", () => {
  it("uses the recorded installer while they are still an admin member", () => {
    expect(
      chooseInstallerForOrganization({
        recordedInstallerUserId: "x",
        ownerUserId: "owner",
        adminMemberUserIds: ["owner", "x"],
      })
    ).toBe("x");
  });

  it("ignores a recorded installer who is no longer an admin member", () => {
    expect(
      chooseInstallerForOrganization({
        recordedInstallerUserId: "gone",
        ownerUserId: "owner",
        adminMemberUserIds: ["owner"],
      })
    ).toBe("owner");
  });

  it("legacy token (nothing recorded): the owner when an admin, else the sole admin", () => {
    expect(
      chooseInstallerForOrganization({
        recordedInstallerUserId: null,
        ownerUserId: "owner",
        adminMemberUserIds: ["owner", "a"],
      })
    ).toBe("owner");
    expect(
      chooseInstallerForOrganization({ recordedInstallerUserId: null, ownerUserId: null, adminMemberUserIds: ["only"] })
    ).toBe("only");
  });

  it("never guesses between several admins with nothing recorded and no admin owner", () => {
    expect(
      chooseInstallerForOrganization({
        recordedInstallerUserId: null,
        ownerUserId: "member-only",
        adminMemberUserIds: ["a", "b"],
      })
    ).toBeNull();
    expect(
      chooseInstallerForOrganization({ recordedInstallerUserId: null, ownerUserId: null, adminMemberUserIds: [] })
    ).toBeNull();
  });
});
