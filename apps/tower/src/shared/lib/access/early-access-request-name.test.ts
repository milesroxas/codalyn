import { describe, expect, it } from "vitest";
import {
  earlyAccessRequestDisplayName,
  normalizeEarlyAccessRequestNameFields,
  parseEarlyAccessRequestNameBody,
} from "@/shared/lib/access/early-access-request-name";

describe("earlyAccessRequestDisplayName", () => {
  it("joins first and last name", () => {
    expect(earlyAccessRequestDisplayName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("returns null when both are empty", () => {
    expect(earlyAccessRequestDisplayName({ firstName: "", lastName: "  " })).toBeNull();
  });
});

describe("parseEarlyAccessRequestNameBody", () => {
  it("trims string fields", () => {
    expect(parseEarlyAccessRequestNameBody({ firstName: "  Ada ", lastName: " Lovelace " })).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("ignores non-string values", () => {
    expect(parseEarlyAccessRequestNameBody({ firstName: 1, lastName: null })).toEqual({
      firstName: null,
      lastName: null,
    });
  });
});

describe("normalizeEarlyAccessRequestNameFields", () => {
  it("stores null for blank strings", () => {
    expect(normalizeEarlyAccessRequestNameFields({ firstName: " ", lastName: undefined })).toEqual({
      firstName: null,
      lastName: null,
    });
  });
});
