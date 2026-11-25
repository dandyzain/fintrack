/**
 * HS256 session tokens built on Web Crypto, so the exact same code verifies
 * tokens in Route Handlers (Node) and in middleware (Edge runtime).
 */

export const SESSION_COOKIE_NAME = "fintrack_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;
export const DEMO_SESSION_TTL_SECONDS = 24 * 3600;

const DEV_FALLBACK_SECRET = "fintrack-dev-only-secret-do-not-use-in-production-0000";
const MIN_SECRET_LENGTH = 32;

export interface SessionPayload {
  /** User id. */
  sub: string;
  /** Session version; must match the user's current value (bumped to revoke sessions). */
  sv: number;
  iat: number;
  exp: number;
  demo?: boolean;
}

export class SessionSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionSecretError";
  }
}

let warned = false;

/**
 * SESSION_SECRET is mandatory in production. A secret that is written in the
 * source code is no secret: anyone could mint a valid session for any user.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  const production = process.env.NODE_ENV === "production";
  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret;
  if (production) {
    throw new SessionSecretError(
      secret
        ? `SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`
        : "SESSION_SECRET is not set. Generate one with `openssl rand -base64 48` and add it to the environment."
    );
  }
  if (!warned) {
    warned = true;
    console.warn("[fintrack] SESSION_SECRET is missing or too short; using an insecure development secret.");
  }
  return secret && secret.length > 0 ? secret.padEnd(MIN_SECRET_LENGTH, "-") : DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ]);
    keyCache.set(secret, key);
  }
  return key;
}

const HEADER = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));

export async function signSessionToken(
  claims: { sub: string; sv: number; demo?: boolean },
  ttlSeconds: number = SESSION_TTL_SECONDS,
  secret: string = getSessionSecret()
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sub: claims.sub, sv: claims.sv, iat: now, exp: now + ttlSeconds };
  if (claims.demo) payload.demo = true;
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${HEADER}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return `${data}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/**
 * Returns the payload when the signature is valid (constant-time check by
 * `crypto.subtle.verify`) and the token is not expired; otherwise null.
 */
export async function verifySessionToken(token: string, secret: string = getSessionSecret()): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const headerJson = JSON.parse(decoder.decode(base64UrlToBytes(header))) as { alg?: string };
    if (headerJson.alg !== "HS256") return null;

    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      base64UrlToBytes(signature),
      encoder.encode(`${header}.${body}`)
    );
    if (!valid) return null;

    const raw = JSON.parse(decoder.decode(base64UrlToBytes(body))) as Partial<SessionPayload> & { userId?: string };
    // Tokens issued before the `sub` claim used `userId`.
    const sub = raw.sub ?? raw.userId;
    if (typeof sub !== "string" || !sub) return null;
    if (typeof raw.exp !== "number" || raw.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      sub,
      sv: typeof raw.sv === "number" ? raw.sv : 0,
      iat: typeof raw.iat === "number" ? raw.iat : 0,
      exp: raw.exp,
      demo: raw.demo === true ? true : undefined,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
