import { describe, expect, it } from "vitest";
import { parseTransactionalEmailAddress } from "@/server/email/resend-send";

describe("parseTransactionalEmailAddress", () => {
  it("accepts a bare address", () => {
    expect(parseTransactionalEmailAddress("mail@codalyn.app")).toBe("mail@codalyn.app");
  });

  it("extracts the address from Name <addr> form", () => {
    expect(parseTransactionalEmailAddress("Miles at Codalyn <mail@codalyn.app>")).toBe("mail@codalyn.app");
  });

  it("trims surrounding whitespace", () => {
    expect(parseTransactionalEmailAddress("  mail@codalyn.app  ")).toBe("mail@codalyn.app");
    expect(parseTransactionalEmailAddress("Name < mail@codalyn.app >")).toBe("mail@codalyn.app");
  });

  it("throws on a value with no address", () => {
    expect(() => parseTransactionalEmailAddress("not-an-email")).toThrow(/RESEND_FROM/);
    expect(() => parseTransactionalEmailAddress("Name <not-an-email>")).toThrow(/RESEND_FROM/);
  });
});
