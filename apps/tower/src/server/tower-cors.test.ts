import { afterEach, describe, expect, it, vi } from "vitest";

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
    expect(h["Access-Control-Allow-Private-Network"]).toBeUndefined();
    expect(h.Vary).toBe("Origin");
  });

  it("grants Private Network Access only when an allowlisted origin's preflight asks for it", () => {
    const asked = towerCorsHeadersFor(
      new Request("https://tower.example/api", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:1337", "Access-Control-Request-Private-Network": "true" },
      })
    );
    expect(asked["Access-Control-Allow-Private-Network"]).toBe("true");

    const notAllowlisted = towerCorsHeadersFor(
      new Request("https://tower.example/api", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example", "Access-Control-Request-Private-Network": "true" },
      })
    );
    expect(notAllowlisted["Access-Control-Allow-Private-Network"]).toBeUndefined();
  });

  it("does not advertise the retired X-Beacon-Tower-User-Id request header", () => {
    const h = towerCorsHeadersFor(new Request("https://tower.example/api"));
    expect(h["Access-Control-Allow-Headers"]).not.toMatch(/X-Beacon-Tower-User-Id/i);
    expect(h["Access-Control-Allow-Headers"]).toMatch(/Authorization/);
  });

  it("reflects Webflow Designer dev app Origin (*.design.webflow.com)", () => {
    const req = new Request("https://tower.example/api", {
      headers: { Origin: "https://codalyn-beacon.design.webflow.com" },
    });
    const h = towerCorsHeadersFor(req);
    expect(h["Access-Control-Allow-Origin"]).toBe("https://codalyn-beacon.design.webflow.com");
    expect(h["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("reflects Webflow extension bundle Origin (*.webflow-ext.com)", () => {
    const req = new Request("https://tower.example/api/auth/get-session", {
      headers: { Origin: "https://69e3aaad66cf6f468fd8ecb8.webflow-ext.com" },
    });
    const h = towerCorsHeadersFor(req);
    expect(h["Access-Control-Allow-Origin"]).toBe("https://69e3aaad66cf6f468fd8ecb8.webflow-ext.com");
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

  it("emits no Access-Control-Allow-Origin when Origin is missing or not allowlisted (never a wildcard)", () => {
    const noOrigin = towerCorsHeadersFor(new Request("https://tower.example/api"));
    expect(noOrigin["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(noOrigin["Access-Control-Allow-Credentials"]).toBeUndefined();
    expect(noOrigin["Access-Control-Allow-Private-Network"]).toBeUndefined();
    expect(noOrigin.Vary).toBe("Origin");

    const bad = towerCorsHeadersFor(
      new Request("https://tower.example/api", { headers: { Origin: "https://evil.example" } })
    );
    expect(bad["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(bad["Access-Control-Allow-Credentials"]).toBeUndefined();
    expect(Object.values(bad)).not.toContain("*");
  });

  it("does not trust local-dev origins on a deployed runtime (VERCEL_ENV set)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    try {
      const dev = towerCorsHeadersFor(
        new Request("https://tower.example/api", { headers: { Origin: "http://localhost:1337" } })
      );
      expect(dev["Access-Control-Allow-Origin"]).toBeUndefined();
      const prod = towerCorsHeadersFor(
        new Request("https://tower.example/api", {
          headers: { Origin: "https://69e2b49536eded7411b48cf6.webflow-ext.com" },
        })
      );
      expect(prod["Access-Control-Allow-Origin"]).toBe("https://69e2b49536eded7411b48cf6.webflow-ext.com");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
