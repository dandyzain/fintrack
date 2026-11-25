import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

const emailSchema = z.string().trim().toLowerCase().email("Format email tidak valid.").max(254);

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Kata sandi minimal harus ${PASSWORD_MIN_LENGTH} karakter.`)
  .max(128, "Kata sandi maksimal 128 karakter.");

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal harus 2 karakter.").max(50, "Nama maksimal 50 karakter."),
  email: emailSchema,
  password: newPasswordSchema,
});

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Kata sandi wajib diisi.").max(128),
});

export const ForgotPasswordSchema = z.object({ email: emailSchema });

export const ResetPasswordSchema = z.object({
  token: z.string().min(20, "Tautan reset tidak valid.").max(200),
  password: newPasswordSchema,
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(20, "Tautan verifikasi tidak valid.").max(200),
});

export const UpdateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal harus 2 karakter.").max(50, "Nama maksimal 50 karakter.").optional(),
    email: emailSchema.optional(),
    /** Required when the email changes. */
    currentPassword: z.string().max(128).optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined, "Tidak ada perubahan yang dikirim.");

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi.").max(128),
  newPassword: newPasswordSchema,
});

export const DeleteAccountSchema = z.object({
  /** Not required for demo accounts (they have no password). */
  password: z.string().max(128).optional(),
  confirm: z.literal("DELETE", { errorMap: () => ({ message: "Ketik DELETE untuk mengonfirmasi." }) }),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  emailVerified?: boolean;
  isDemo?: boolean;
}

export interface AuthResponseData {
  user: AuthUser;
  token: string;
}
