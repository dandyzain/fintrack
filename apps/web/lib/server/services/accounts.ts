import crypto from "crypto";
import type { RegisterInput } from "@fintrack/shared";
import { appBaseUrl, isProduction } from "../config";
import { DEFAULT_CATEGORIES, defaultUserSetup } from "../domain/defaults";
import { buildSampleData } from "../domain/sample-data";
import { badRequest, forbidden, unauthorized } from "../errors";
import { log } from "../logger";
import { actionEmail, isEmailConfigured, sendEmail } from "../mailer";
import { burnPasswordCheck, createOpaqueToken, hashOpaqueToken, hashPassword, needsRehash, verifyPassword } from "../password";
import { deleteUserReceipts } from "../receipts";
import { getStore } from "../store";
import type { UserRecord } from "../store/types";
import { serializeTransactions } from "./transactions";

const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS = "Email atau kata sandi tidak cocok.";

export async function registerUser(input: RegisterInput, requestUrl: string): Promise<UserRecord> {
  const user = await getStore().createUser(
    { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
    defaultUserSetup()
  );
  await sendVerificationEmail(user, requestUrl);
  return user;
}

/** Verifies credentials in constant-ish time and upgrades legacy hashes on success. */
export async function authenticate(email: string, password: string): Promise<UserRecord> {
  const store = getStore();
  const user = await store.findUserByEmail(email);
  if (!user || !user.passwordHash) {
    await burnPasswordCheck(password);
    throw unauthorized(INVALID_CREDENTIALS);
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw unauthorized(INVALID_CREDENTIALS);
  if (needsRehash(user.passwordHash)) {
    await store.updateUser(user.id, { passwordHash: await hashPassword(password) });
  }
  return user;
}

/**
 * Every visitor of "Try the demo" gets an isolated sandbox with fresh sample
 * data, so nobody sees or edits anyone else's demo data. Sandboxes expire
 * after 24 hours and are purged opportunistically.
 */
export async function createDemoSandbox(): Promise<UserRecord> {
  const store = getStore();
  try {
    const removed = await store.deleteDemoUsers(new Date(Date.now() - DEMO_TTL_MS), 25);
    await Promise.all(removed.map(deleteUserReceipts));
  } catch (err) {
    log.warn("demo_cleanup_failed", { message: (err as Error).message });
  }
  const user = await store.createUser(
    {
      name: "Demo",
      email: `demo-${crypto.randomUUID()}@demo.fintrack.invalid`,
      passwordHash: null,
      isDemo: true,
    },
    { wallets: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })) }
  );
  await store.importSampleData(user.id, buildSampleData());
  return user;
}

/* ---------- email verification ---------- */

export async function sendVerificationEmail(user: UserRecord, requestUrl: string): Promise<{ sent: boolean }> {
  if (user.isDemo || user.emailVerifiedAt) return { sent: false };
  // Without a mail provider, production skips it (nothing could be delivered); development logs the link.
  if (!isEmailConfigured() && isProduction()) return { sent: false };
  try {
    const { token, tokenHash } = createOpaqueToken();
    await getStore().createAuthToken({ userId: user.id, type: "EMAIL_VERIFICATION", tokenHash, expiresAt: new Date(Date.now() + VERIFY_TTL_MS) });
    const url = `${appBaseUrl(requestUrl)}/verify-email?token=${token}`;
    const { delivered } = await sendEmail({
      to: user.email,
      subject: "Verifikasi email FinTrack Anda",
      ...actionEmail({
        name: user.name,
        intro: "Terima kasih telah mendaftar di FinTrack. Konfirmasi bahwa alamat email ini milik Anda.",
        action: "Verifikasi email",
        url,
        outro: "Tautan berlaku 48 jam. Abaikan email ini jika Anda tidak merasa mendaftar.",
      }),
    });
    return { sent: delivered };
  } catch (err) {
    log.warn("verification_email_failed", { message: (err as Error).message });
    return { sent: false };
  }
}

export async function verifyEmail(token: string): Promise<UserRecord> {
  const store = getStore();
  const res = await store.consumeAuthToken(hashOpaqueToken(token), "EMAIL_VERIFICATION");
  if (!res) throw badRequest("Tautan verifikasi tidak valid atau sudah kedaluwarsa.");
  return store.updateUser(res.userId, { emailVerifiedAt: new Date() });
}

/* ---------- password reset ---------- */

/** Always resolves the same way, whether or not the email exists (no account enumeration). */
export async function requestPasswordReset(email: string, requestUrl: string): Promise<void> {
  const store = getStore();
  const user = await store.findUserByEmail(email);
  if (!user || user.isDemo) return;
  const { token, tokenHash } = createOpaqueToken();
  await store.createAuthToken({ userId: user.id, type: "PASSWORD_RESET", tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) });
  const url = `${appBaseUrl(requestUrl)}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Atur ulang kata sandi FinTrack",
    ...actionEmail({
      name: user.name,
      intro: "Kami menerima permintaan untuk mengatur ulang kata sandi akun FinTrack Anda.",
      action: "Atur ulang kata sandi",
      url,
      outro: "Tautan berlaku 1 jam dan hanya bisa dipakai sekali. Abaikan email ini jika bukan Anda yang meminta.",
    }),
  });
}

export async function resetPassword(token: string, password: string): Promise<UserRecord> {
  const store = getStore();
  const res = await store.consumeAuthToken(hashOpaqueToken(token), "PASSWORD_RESET");
  if (!res) throw badRequest("Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.");
  const user = await store.findUserById(res.userId);
  if (!user) throw badRequest("Akun tidak ditemukan.");
  // Signs out every existing session; opening the emailed link also proves the address.
  return store.updateUser(user.id, {
    passwordHash: await hashPassword(password),
    bumpSessionVersion: true,
    emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
  });
}

/* ---------- account settings ---------- */

export async function changePassword(user: UserRecord, currentPassword: string, newPassword: string): Promise<UserRecord> {
  if (user.isDemo) throw forbidden("Akun demo tidak memiliki kata sandi. Buat akun untuk menyimpan data Anda.");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) throw badRequest("Kata sandi saat ini salah.");
  return getStore().updateUser(user.id, { passwordHash: await hashPassword(newPassword), bumpSessionVersion: true });
}

export async function updateProfile(
  user: UserRecord,
  input: { name?: string; email?: string; currentPassword?: string },
  requestUrl: string
): Promise<UserRecord> {
  const emailChanged = input.email !== undefined && input.email !== user.email;
  if (emailChanged) {
    if (user.isDemo) throw forbidden("Email akun demo tidak dapat diubah.");
    if (!input.currentPassword || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw badRequest("Masukkan kata sandi saat ini untuk mengganti email.");
    }
  }
  const updated = await getStore().updateUser(user.id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(emailChanged ? { email: input.email, emailVerifiedAt: null } : {}),
  });
  if (emailChanged) await sendVerificationEmail(updated, requestUrl);
  return updated;
}

export async function deleteAccount(user: UserRecord, password: string | undefined): Promise<void> {
  if (!user.isDemo && !(await verifyPassword(password ?? "", user.passwordHash))) {
    throw badRequest("Kata sandi salah. Akun tidak dihapus.");
  }
  await getStore().deleteUser(user.id);
  await deleteUserReceipts(user.id);
}

/** Everything stored about the user, as JSON (data portability). */
export async function exportAccount(user: UserRecord) {
  const store = getStore();
  const [wallets, categories, transactions, budgets, recurring] = await Promise.all([
    store.listWallets(user.id),
    store.listCategories(user.id),
    store.transactionsBetween(user.id, new Date(Date.UTC(1970, 0, 1)), new Date(Date.UTC(2200, 0, 1)), { withItems: true }),
    store.listAllBudgets(user.id),
    store.listRecurring(user.id),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    format: "fintrack-export/v1",
    profile: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt, emailVerifiedAt: user.emailVerifiedAt },
    wallets: wallets.map(({ transactionCount: _count, ...w }) => w),
    categories: categories.filter((c) => c.userId === user.id),
    transactions: await serializeTransactions(transactions),
    budgets,
    recurring,
  };
}
