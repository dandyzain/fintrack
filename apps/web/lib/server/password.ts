import crypto from "crypto";
import { promisify } from "util";

/**
 * Password hashing with scrypt (memory-hard, built into Node).
 * Stored format: `scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>`.
 *
 * Hashes created before this module (`<salt hex>:<hash hex>`, PBKDF2-SHA512
 * with only 1,000 iterations) still verify, and `needsRehash` tells the login
 * route to upgrade them transparently.
 */

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>;

const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAXMEM = 128 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...PARAMS, maxmem: MAXMEM });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;

  if (stored.startsWith("scrypt$")) {
    const [, n, r, p, saltB64, hashB64] = stored.split("$");
    const expected = Buffer.from(hashB64 ?? "", "base64");
    if (!saltB64 || expected.length === 0) return false;
    const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });
    return safeEqual(key, expected);
  }

  // Legacy PBKDF2 format: "<salt>:<hex hash>"
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const key = await new Promise<Buffer>((resolve, reject) =>
    crypto.pbkdf2(password, salt, 1000, 64, "sha512", (err, derived) => (err ? reject(err) : resolve(derived)))
  );
  return safeEqual(key, expected);
}

export function needsRehash(stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (!stored.startsWith("scrypt$")) return true;
  const [, n, r, p] = stored.split("$");
  return Number(n) < PARAMS.N || Number(r) !== PARAMS.r || Number(p) !== PARAMS.p;
}

/**
 * Hash computed for unknown emails so that "no such user" and "wrong password"
 * take the same time (prevents account enumeration by timing).
 */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("fintrack-timing-equalizer");
  await verifyPassword(password, await dummyHash);
}

/** Random URL-safe token plus the SHA-256 hash that is stored in the database. */
export function createOpaqueToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashOpaqueToken(token) };
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
