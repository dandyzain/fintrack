import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSessionSecret } from "@/lib/auth/token";
import { badRequest } from "./errors";
import { log } from "./logger";

/**
 * Receipt images are private. The database stores only the object path
 * (`<userId>/<file>`); every API response turns it into a short-lived signed
 * URL. Paths always come from the session's user id, never from the client.
 *
 * Storage: a private Supabase bucket when SUPABASE_SERVICE_ROLE_KEY is set,
 * otherwise an in-memory store (development / demo), served by
 * /api/receipts/file with an HMAC-signed, expiring link.
 */

export const RECEIPT_URL_TTL_SECONDS = 60 * 60;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const MEMORY_MAX_FILES = 80;

const bucket = () => process.env.SUPABASE_RECEIPT_BUCKET || "receipts";

let client: SupabaseClient | null | undefined;
function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && !key && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    log.warn("receipts_anon_key_ignored", {
      hint: "A private bucket needs SUPABASE_SERVICE_ROLE_KEY (server-only). Using in-memory receipt storage.",
    });
  }
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}

export function isRemoteStorage(): boolean {
  return supabase() !== null;
}

declare global {
  // eslint-disable-next-line no-var
  var __fintrackReceiptFiles: Map<string, { bytes: Buffer; contentType: string }> | undefined;
}
const memoryFiles = () => (globalThis.__fintrackReceiptFiles ??= new Map());

/* ---------- file type detection (magic bytes, not the client's label) ---------- */

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

export function detectImageType(buf: Buffer): keyof typeof EXT | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand)) return "image/heic";
    if (["mif1", "msf1", "heif"].includes(brand)) return "image/heif";
  }
  return null;
}

/* ---------- references ---------- */

const PATH_RE = /^[0-9a-zA-Z-]{1,64}\/[0-9A-Za-z._-]{1,128}$/;

function pathFromUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value, "http://relative.invalid");
  } catch {
    return null;
  }
  if (url.pathname === "/api/receipts/file") return url.searchParams.get("p");
  const m = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
  if (m && decodeURIComponent(m[1]) === bucket()) return decodeURIComponent(m[2]);
  return null;
}

/** Storage path for a value that is a path or one of our own (signed/public) URLs. */
export function receiptPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (PATH_RE.test(value)) return value;
  const p = pathFromUrl(value);
  return p && PATH_RE.test(p) ? p : null;
}

/**
 * Validates a receipt reference sent by a client (it usually echoes the signed
 * URL it received from the scan endpoint) and returns the path to store. A
 * reference to another user's file is rejected.
 */
export function normalizeReceiptRef(value: string | null | undefined, userId: string): string | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const path = receiptPath(value.trim());
  if (!path || !path.startsWith(`${userId}/`)) throw badRequest("Referensi gambar struk tidak valid.");
  return path;
}

/* ---------- signed URLs ---------- */

function memorySignature(path: string, exp: number): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(`receipt:${path}:${exp}`).digest("base64url");
}

export function verifyMemoryReceiptLink(path: string, exp: number, sig: string): boolean {
  if (!PATH_RE.test(path) || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(memorySignature(path, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/**
 * Maps stored references to displayable URLs. Unknown absolute URLs (e.g.
 * legacy sample images) pass through unchanged; failures resolve to null.
 */
export async function resolveReceiptUrls(refs: (string | null | undefined)[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const paths: string[] = [];
  for (const ref of refs) {
    if (!ref || out.has(ref)) continue;
    const path = receiptPath(ref);
    if (path) paths.push(path);
    else out.set(ref, /^https:\/\//.test(ref) ? ref : null);
  }
  if (!paths.length) return out;

  const unique = Array.from(new Set(paths));
  const signed = new Map<string, string | null>();
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb.storage.from(bucket()).createSignedUrls(unique, RECEIPT_URL_TTL_SECONDS);
    if (error) log.warn("receipt_sign_failed", { message: error.message });
    for (const row of data ?? []) if (row.path) signed.set(row.path, row.signedUrl ?? null);
  } else {
    const exp = Math.floor(Date.now() / 1000) + RECEIPT_URL_TTL_SECONDS;
    for (const p of unique) {
      signed.set(p, memoryFiles().has(p) ? `/api/receipts/file?p=${encodeURIComponent(p)}&e=${exp}&s=${memorySignature(p, exp)}` : null);
    }
  }
  for (const ref of refs) {
    if (!ref || out.has(ref)) continue;
    const path = receiptPath(ref);
    out.set(ref, path ? signed.get(path) ?? null : null);
  }
  return out;
}

export async function resolveReceiptUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  return (await resolveReceiptUrls([ref])).get(ref) ?? null;
}

/* ---------- upload / delete ---------- */

export async function uploadReceipt(userId: string, bytes: Buffer, contentType: keyof typeof EXT): Promise<string> {
  const path = `${userId}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${EXT[contentType]}`;
  const sb = supabase();
  if (sb) {
    const { error } = await sb.storage.from(bucket()).upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return path;
  }
  const files = memoryFiles();
  files.set(path, { bytes, contentType });
  while (files.size > MEMORY_MAX_FILES) files.delete(files.keys().next().value as string);
  return path;
}

export function readMemoryReceipt(path: string) {
  return memoryFiles().get(path) ?? null;
}

/** Best effort: storage cleanup must never fail the user's action. */
export async function deleteReceipts(refs: (string | null | undefined)[]): Promise<void> {
  const paths = Array.from(new Set(refs.map(receiptPath).filter((p): p is string => Boolean(p))));
  if (!paths.length) return;
  try {
    const sb = supabase();
    if (sb) {
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await sb.storage.from(bucket()).remove(paths.slice(i, i + 100));
        if (error) log.warn("receipt_delete_failed", { message: error.message });
      }
    } else {
      for (const p of paths) memoryFiles().delete(p);
    }
  } catch (err) {
    log.warn("receipt_delete_failed", { message: (err as Error).message });
  }
}

/** Removes every receipt file of a user (account deletion, expired demo sandboxes). */
export async function deleteUserReceipts(userId: string): Promise<void> {
  if (!/^[0-9a-zA-Z-]{1,64}$/.test(userId)) return;
  try {
    const sb = supabase();
    if (!sb) {
      for (const key of Array.from(memoryFiles().keys())) if (key.startsWith(`${userId}/`)) memoryFiles().delete(key);
      return;
    }
    for (let round = 0; round < 50; round++) {
      const { data, error } = await sb.storage.from(bucket()).list(userId, { limit: 100 });
      if (error || !data?.length) return;
      const { error: removeError } = await sb.storage.from(bucket()).remove(data.map((f) => `${userId}/${f.name}`));
      if (removeError) return;
    }
  } catch (err) {
    log.warn("receipt_folder_delete_failed", { message: (err as Error).message });
  }
}
