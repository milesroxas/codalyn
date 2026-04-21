import { describe, expect, it } from "vitest";

import { userToBeaconPayload } from "./resolve-email-auth-session";

describe("userToBeaconPayload", () => {
  it("stringifies id and email", () => {
    expect(userToBeaconPayload({ id: 42, email: "a@b.com", name: "N" })).toEqual({
      id: "42",
      email: "a@b.com",
      name: "N",
      image: undefined,
    });
  });

  it("uses empty string for missing email", () => {
    expect(userToBeaconPayload({ id: "x" }).email).toBe("");
  });
});
