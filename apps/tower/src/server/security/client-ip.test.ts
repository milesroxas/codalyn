import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://tower.test/api", { headers });
}

describe("getClientIp", () => {
  it("reads the first x-forwarded-for entry", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(getClientIp(requestWith({ "x-forwarded-for": "  9.9.9.9  " }))).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(requestWith({ "x-real-ip": "4.4.4.4" }))).toBe("4.4.4.4");
  });

  it("returns null when no proxy header is present", () => {
    expect(getClientIp(requestWith({}))).toBeNull();
    expect(getClientIp(requestWith({ "x-forwarded-for": "" }))).toBeNull();
  });
});
