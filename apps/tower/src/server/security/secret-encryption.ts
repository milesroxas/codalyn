import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption-at-rest for stored third-party secrets (Webflow OAuth tokens).
 *
 * Key: `TOWER_TOKEN_ENCRYPTION_KEY`, a 32-byte key encoded as base64 or hex
 * (`openssl rand -base64 32`). When unset outside production, values pass through as plaintext so
 * local dev keeps working (one-time warning). In production a missing/invalid key is a hard failure
 * on write: storing a third-party credential in plaintext is never the silent default. The only
 * escape hatch is `TOWER_TOKEN_ENCRYPTION_ALLOW_PLAINTEXT=1`, for a deliberate, logged emergency.
 *
 * Format: `enc:v1:<base64(iv | authTag | ciphertext)>`. Values without the prefix are
 * treated as legacy plaintext on read (lazy migration — rows re-encrypt on next write).
 */
const ENCRYPTED_PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function parseEncryptionKey(raw: string | undefined): Buffer | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }
  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    /* fall through */
  }
  console.error("[tower/secret-encryption] TOWER_TOKEN_ENCRYPTION_KEY is set but is not a 32-byte base64/hex key");
  return null;
}

let warnedMissingKey = false;

/** Thrown from production writes when no usable encryption key is configured. */
export class MissingSecretEncryptionKeyError extends Error {
  readonly code = "secret_encryption_key_missing" as const;

  constructor() {
    super(
      "TOWER_TOKEN_ENCRYPTION_KEY is not set (or not a 32-byte base64/hex key); refusing to store a credential in plaintext in production"
    );
    this.name = "MissingSecretEncryptionKeyError";
  }
}

/** Pure policy: may a write proceed in plaintext when the key is missing? Exported for tests. */
export function isPlaintextSecretStorageAllowed(env: {
  NODE_ENV?: string;
  TOWER_TOKEN_ENCRYPTION_ALLOW_PLAINTEXT?: string;
}): boolean {
  if (env.NODE_ENV !== "production") {
    return true;
  }
  return env.TOWER_TOKEN_ENCRYPTION_ALLOW_PLAINTEXT?.trim() === "1";
}

function getEncryptionKey(): Buffer | null {
  const key = parseEncryptionKey(process.env.TOWER_TOKEN_ENCRYPTION_KEY);
  if (!key && !warnedMissingKey && process.env.NODE_ENV === "production") {
    warnedMissingKey = true;
    console.warn(
      "[tower/secret-encryption] TOWER_TOKEN_ENCRYPTION_KEY not set — stored OAuth tokens are NOT encrypted at rest"
    );
  }
  return key;
}

/**
 * Encrypts a secret for storage. Passthrough (plaintext) when no valid key is configured *and* the
 * environment allows it (never production without the explicit override) — otherwise throws
 * {@link MissingSecretEncryptionKeyError} so the credential is not persisted at all.
 */
export function encryptStoredSecret(plain: string): string {
  const key = getEncryptionKey();
  if (!key) {
    if (!isPlaintextSecretStorageAllowed(process.env)) {
      throw new MissingSecretEncryptionKeyError();
    }
    return plain;
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${Buffer.concat([iv, authTag, ciphertext]).toString("base64")}`;
}

/**
 * Decrypts a stored secret. Legacy plaintext (no `enc:v1:` prefix) passes through unchanged.
 * Returns null when the value is encrypted but cannot be decrypted (missing/rotated key,
 * tampered ciphertext) — callers must treat that as "no token" and require a reconnect.
 */
export function decryptStoredSecret(stored: string): string | null {
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored;
  }
  const key = getEncryptionKey();
  if (!key) {
    console.error("[tower/secret-encryption] encrypted value present but TOWER_TOKEN_ENCRYPTION_KEY is missing");
    return null;
  }
  try {
    const payload = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), "base64");
    if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
      return null;
    }
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    console.error("[tower/secret-encryption] failed to decrypt stored secret (rotated key or tampered value)");
    return null;
  }
}
