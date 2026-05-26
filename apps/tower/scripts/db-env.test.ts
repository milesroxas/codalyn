import { describe, expect, it } from "vitest";
import {
  assertSafeRemoteDatabaseUrl,
  assertValidNeonBranchName,
  parseDbScriptArgs,
  requireProdMigrationConfirm,
} from "./db-env.mjs";

describe("assertValidNeonBranchName", () => {
  it("accepts common branch names", () => {
    expect(assertValidNeonBranchName("preview")).toBe("preview");
    expect(assertValidNeonBranchName("development")).toBe("development");
    expect(assertValidNeonBranchName("main")).toBe("main");
  });

  it("accepts point-in-time branch syntax", () => {
    expect(assertValidNeonBranchName("preview@2024-01-01T00:00:00Z")).toBe("preview@2024-01-01T00:00:00Z");
  });

  it("rejects empty and unsafe branch names", () => {
    expect(() => assertValidNeonBranchName("")).toThrow(/Invalid Neon branch name/);
    expect(() => assertValidNeonBranchName("../prod")).toThrow(/Invalid Neon branch name/);
    expect(() => assertValidNeonBranchName("branch;drop table")).toThrow(/Invalid Neon branch name/);
  });
});

describe("assertSafeRemoteDatabaseUrl", () => {
  const neonPreview = "postgresql://user:pass@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

  it("allows local host for local target", () => {
    expect(assertSafeRemoteDatabaseUrl("local", "postgresql://tower:tower@127.0.0.1:35432/tower").hostname).toBe(
      "127.0.0.1"
    );
  });

  it("blocks local host for preview target", () => {
    expect(() => assertSafeRemoteDatabaseUrl("preview", "postgresql://tower:tower@127.0.0.1:35432/tower")).toThrow(
      /looks local/
    );
  });

  it("blocks non-neon host for prod unless overridden", () => {
    expect(() => assertSafeRemoteDatabaseUrl("prod", neonPreview.replace(".neon.tech", ".example.com"))).toThrow(
      /not a Neon host/
    );
  });

  it("allows neon host for prod", () => {
    expect(assertSafeRemoteDatabaseUrl("prod", neonPreview).hostname).toContain("neon.tech");
  });
});

describe("requireProdMigrationConfirm", () => {
  const prodUrl = "postgresql://user:pass@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

  it("requires confirm for prod", () => {
    expect(() => requireProdMigrationConfirm("prod", prodUrl)).toThrow(/without --confirm/);
  });

  it("allows prod when confirmed", () => {
    expect(() => requireProdMigrationConfirm("prod", prodUrl, { confirmed: true })).not.toThrow();
  });

  it("skips confirm for non-prod targets", () => {
    expect(() => requireProdMigrationConfirm("preview", prodUrl)).not.toThrow();
  });
});

describe("parseDbScriptArgs", () => {
  it("parses flags and target", () => {
    expect(parseDbScriptArgs(["node", "script", "prod", "--vercel", "--confirm"])).toEqual({
      target: "prod",
      useVercel: true,
      confirmed: true,
      dryRun: false,
    });
  });
});
