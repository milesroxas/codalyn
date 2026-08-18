import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptStoredSecret,
  encryptStoredSecret,
  isPlaintextSecretStorageAllowed,
  MissingSecretEncryptionKeyError,
} from "./secret-encryption";

const BASE64_KEY = Buffer.alloc(32, 7).toString("base64");
const HEX_KEY = Buffer.alloc(32, 9).toString("hex");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("encryptStoredSecret / decryptStoredSecret", () => {
  it("round-trips with a base64 key and marks the value with the enc:v1: prefix", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", BASE64_KEY);
    const encrypted = encryptStoredSecret("wf_access_token_123");
    expect(encrypted.startsWith("enc:v1:")).toBe(true);
    expect(encrypted).not.toContain("wf_access_token_123");
    expect(decryptStoredSecret(encrypted)).toBe("wf_access_token_123");
  });

  it("round-trips with a hex key", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", HEX_KEY);
    const encrypted = encryptStoredSecret("secret");
    expect(decryptStoredSecret(encrypted)).toBe("secret");
  });

  it("produces a different ciphertext per call (random IV) that still decrypts", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", BASE64_KEY);
    const a = encryptStoredSecret("same");
    const b = encryptStoredSecret("same");
    expect(a).not.toBe(b);
    expect(decryptStoredSecret(a)).toBe("same");
    expect(decryptStoredSecret(b)).toBe("same");
  });

  it("passes plaintext through unchanged when no key is configured", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", "");
    expect(encryptStoredSecret("plain_token")).toBe("plain_token");
    expect(decryptStoredSecret("plain_token")).toBe("plain_token");
  });

  it("passes legacy plaintext through on read even when a key is configured", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", BASE64_KEY);
    expect(decryptStoredSecret("legacy_plaintext_token")).toBe("legacy_plaintext_token");
  });

  it("treats a malformed key (wrong size / garbage) as missing and passes through", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", "not-a-valid-key");
    expect(encryptStoredSecret("plain_token")).toBe("plain_token");
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", Buffer.alloc(16, 1).toString("base64"));
    expect(encryptStoredSecret("plain_token")).toBe("plain_token");
  });

  it("returns null for a tampered ciphertext", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", BASE64_KEY);
    const encrypted = encryptStoredSecret("secret");
    const payload = Buffer.from(encrypted.slice("enc:v1:".length), "base64");
    payload[payload.length - 1] ^= 0xff;
    expect(decryptStoredSecret(`enc:v1:${payload.toString("base64")}`)).toBeNull();
  });

  it("returns null for an encrypted value when the key is missing or rotated", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", BASE64_KEY);
    const encrypted = encryptStoredSecret("secret");
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", "");
    expect(decryptStoredSecret(encrypted)).toBeNull();
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 2).toString("base64"));
    expect(decryptStoredSecret(encrypted)).toBeNull();
  });

  it("returns null for a truncated encrypted payload", () => {
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", BASE64_KEY);
    expect(decryptStoredSecret(`enc:v1:${Buffer.alloc(8).toString("base64")}`)).toBeNull();
  });
});

describe("production hard-fail without a key", () => {
  it("allows plaintext passthrough outside production", () => {
    expect(isPlaintextSecretStorageAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(isPlaintextSecretStorageAllowed({ NODE_ENV: "test" })).toBe(true);
    expect(isPlaintextSecretStorageAllowed({})).toBe(true);
  });

  it("refuses plaintext in production unless the explicit override is set", () => {
    expect(isPlaintextSecretStorageAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(
      isPlaintextSecretStorageAllowed({ NODE_ENV: "production", TOWER_TOKEN_ENCRYPTION_ALLOW_PLAINTEXT: "0" })
    ).toBe(false);
    expect(
      isPlaintextSecretStorageAllowed({ NODE_ENV: "production", TOWER_TOKEN_ENCRYPTION_ALLOW_PLAINTEXT: "1" })
    ).toBe(true);
  });

  it("throws on a production write when the key is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", "");
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_ALLOW_PLAINTEXT", "");
    expect(() => encryptStoredSecret("plain_token")).toThrow(MissingSecretEncryptionKeyError);
  });

  it("still encrypts normally in production when the key is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", BASE64_KEY);
    expect(decryptStoredSecret(encryptStoredSecret("secret"))).toBe("secret");
  });

  it("legacy plaintext reads keep working in production without a key (read path is not the leak)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOWER_TOKEN_ENCRYPTION_KEY", "");
    expect(decryptStoredSecret("legacy_plaintext_token")).toBe("legacy_plaintext_token");
  });
});
