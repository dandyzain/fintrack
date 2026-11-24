import crypto from "crypto";

/**
 * Password hashing for FinTrack.
 *
 * Current format (self-describing, so parameters can be raised later):
 *
 *   pbkdf2-sha512$<iterations>$<salt-hex>$<hash-hex>
 *
 * Legacy format (pre-2026-11, still accepted by verifyPassword):
 *
 *   <salt>:<hash-hex>   — PBKDF2-HMAC-SHA512, 1000 iterations, 64-byte key,
 *                         salt string used as-is (UTF-8), not hex-decoded.
 *
 * Use passwordNeedsRehash() after a successful verify to decide whether the
 * stored hash should be replaced with hashPassword(password).
 */

const ALGORITHM = "pbkdf2-sha512";
const DIGEST = "sha512";

/** OWASP Password Storage Cheat Sheet recommendation for PBKDF2-HMAC-SHA512. */
export const PBKDF2_ITERATIONS = 210_000;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

const LEGACY_ITERATIONS = 1000;
const LEGACY_KEY_LENGTH = 64;

// Guards against malformed or hostile stored values driving huge work factors.
const MAX_ITERATIONS = 10_000_000;

const HEX_RE = /^(?:[0-9a-f]{2})+$/i;

type ParsedHash = {
  iterations: number;
  salt: Buffer | string;
  hash: Buffer;
  legacy: boolean;
};

function pbkdf2(
  password: string,
  salt: Buffer | string,
  iterations: number,
  keyLength: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keyLength, DIGEST, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

function parseHash(stored: string): ParsedHash | null {
  if (stored.startsWith(`${ALGORITHM}$`)) {
    const parts = stored.split("$");
    if (parts.length !== 4) return null;
    const [, iterStr, saltHex, hashHex] = parts;

    if (!/^[1-9][0-9]*$/.test(iterStr)) return null;
    const iterations = Number(iterStr);
    if (iterations > MAX_ITERATIONS) return null;
    if (!HEX_RE.test(saltHex) || !HEX_RE.test(hashHex)) return null;

    return {
      iterations,
      salt: Buffer.from(saltHex, "hex"),
      hash: Buffer.from(hashHex, "hex"),
      legacy: false,
    };
  }

  const sep = stored.indexOf(":");
  if (sep > 0 && sep === stored.lastIndexOf(":")) {
    const salt = stored.slice(0, sep);
    const hashHex = stored.slice(sep + 1);
    if (!HEX_RE.test(hashHex) || hashHex.length !== LEGACY_KEY_LENGTH * 2) {
      return null;
    }
    return {
      iterations: LEGACY_ITERATIONS,
      salt,
      hash: Buffer.from(hashHex, "hex"),
      legacy: true,
    };
  }

  return null;
}

/** Hash a password with the current parameters. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH);
  return `${ALGORITHM}$${PBKDF2_ITERATIONS}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Check a password against a stored hash in either the current or the legacy
 * format. Returns false (never throws) for a malformed stored value.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;

  const derived = await pbkdf2(
    password,
    parsed.salt,
    parsed.iterations,
    parsed.hash.length
  );
  return crypto.timingSafeEqual(derived, parsed.hash);
}

/**
 * True when the stored hash was made with weaker or different parameters than
 * hashPassword() uses today (including the legacy `salt:hash` format).
 */
export function passwordNeedsRehash(stored: string): boolean {
  const parsed = parseHash(stored);
  if (!parsed) return true;
  return (
    parsed.legacy ||
    parsed.iterations < PBKDF2_ITERATIONS ||
    parsed.hash.length !== KEY_LENGTH
  );
}
