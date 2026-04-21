import { afterEach, describe, expect, it } from "vitest";

import { towerCorsHeadersFor } from "./tower-cors";

describe("towerCorsHeadersFor", () => {
  const prevEnv = process.env.TOWER_CORS_ORIGINS;

  afterEach(() => {
    if (prevEnv === undefined) {
      delete process.env.TOWER_CORS_ORIGINS;
    } else {
      process.env.TOWER_CORS_ORIGINS = prevEnv;
    }
  });

  it("reflects allowlisted Origin with credentials", () => {
    const req = new Request("https://tower.example/api", {
      headers: { Origin: "http://localhost:1337" },
    });
    const h = towerCorsHeadersFor(req);
    expect(h["Access-Control-Allow-Origin"]).toBe("http://localhost:1337");
    expect(h["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("includes extra origins from TOWER_CORS_ORIGINS", () => {
    process.env.TOWER_CORS_ORIGINS = "https://custom.test";
    const req = new Request("https://tower.example/api", {
      headers: { Origin: "https://custom.test" },
    });
    const h = towerCorsHeadersFor(req);
    expect(h["Access-Control-Allow-Origin"]).toBe("https://custom.test");
    expect(h["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("uses wildcard without credentials when Origin is missing or not allowlisted", () => {
    const noOrigin = towerCorsHeadersFor(new Request("https://tower.example/api"));
    expect(noOrigin["Access-Control-Allow-Origin"]).toBe("*");
    expect(noOrigin["Access-Control-Allow-Credentials"]).toBeUndefined();

    const bad = new Request("https://tower.example/api", {
      headers: { Origin: "https://evil.example" },
    });
    expect(towerCorsHeadersFor(bad)["Access-Control-Allow-Origin"]).toBe("*");
  });
});
