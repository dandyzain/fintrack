import { z } from "zod";

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal harus 2 karakter.")
    .max(50, "Nama maksimal 50 karakter."),
  email: z
    .string()
    .email("Format email tidak valid.")
    .toLowerCase(),
  password: z
    .string()
    .min(6, "Kata sandi minimal harus 6 karakter.")
    .max(100, "Kata sandi maksimal 100 karakter."),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email("Format email tidak valid.")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Kata sandi wajib diisi."),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponseData {
  user: AuthUser;
  token: string;
}
