import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption-at-rest for stored third-party secrets (Webflow OAuth tokens).
 *
 * Key: `TOWER_TOKEN_ENCRYPTION_KEY`, a 32-byte key encoded as base64 or hex
 * (`openssl rand -base64 32`). When unset, values pass through as plaintext so local dev
 * and existing deployments keep working; production logs a one-time warning.
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

/** Encrypts a secret for storage. Passthrough (plaintext) when no valid key is configured. */
export function encryptStoredSecret(plain: string): string {
  const key = getEncryptionKey();
  if (!key) {
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
