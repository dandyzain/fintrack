import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { RegisterSchema, type ApiResponse, type AuthResponseData } from "@fintrack/shared";
import { prisma } from "@fintrack/database";
import { demoStore } from "@/lib/demo-store";
import { signSessionToken, setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = RegisterSchema.safeParse(body);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: issue?.message || "Data registrasi tidak valid.",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;
    let authUser: { id: string; name: string; email: string };

    if (!process.env.DATABASE_URL) {
      try {
        authUser = demoStore.registerUser(name, email, password);
      } catch (err) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: (err as Error).message },
          { status: 409 }
        );
      }
    } else {
      try {
        const existing = await prisma.user.findUnique({
          where: { email },
        });

        if (existing) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Email sudah terdaftar. Silakan gunakan email lain atau masuk." },
            { status: 409 }
          );
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const passwordHash = crypto
          .pbkdf2Sync(password, salt, 1000, 64, "sha512")
          .toString("hex");
        const fullHash = `${salt}:${passwordHash}`;

        const createdUser = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash: fullHash,
          },
        });

        // Initialize starter wallets
        await prisma.wallet.createMany({
          data: [
            { userId: createdUser.id, name: "Rekening Bank", balance: 0 },
            { userId: createdUser.id, name: "Dompet Tunai", balance: 0 },
            { userId: createdUser.id, name: "E-Wallet", balance: 0 },
          ],
        });

        // Initialize default categories
        await prisma.category.createMany({
          data: [
            { userId: createdUser.id, name: "Makanan & Minuman", icon: "Utensils", color: "#F97316" },
            { userId: createdUser.id, name: "Belanja Bulanan", icon: "ShoppingCart", color: "#10B981" },
            { userId: createdUser.id, name: "Transportasi", icon: "Car", color: "#3B82F6" },
            { userId: createdUser.id, name: "Kesehatan", icon: "HeartPulse", color: "#EC4899" },
            { userId: createdUser.id, name: "Hiburan", icon: "Film", color: "#8B5CF6" },
            { userId: createdUser.id, name: "Lainnya", icon: "Tag", color: "#6B7280" },
          ],
        });

        authUser = {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
        };
      } catch (err) {
        // Fallback to local demo store if DB fails
        authUser = demoStore.registerUser(name, email, password);
      }
    }

    const token = signSessionToken({
      userId: authUser.id,
      name: authUser.name,
      email: authUser.email,
    });

    setSessionCookie(token);

    const response = NextResponse.json<ApiResponse<AuthResponseData>>(
      {
        success: true,
        data: {
          user: authUser,
          token,
        },
        message: "Pendaftaran berhasil! Selamat datang di FinTrack.",
      },
      { status: 201 }
    );

    // Also attach cookie directly in response headers for maximum cross-client compatibility
    response.cookies.set({
      name: "fintrack_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (error) {
    console.error("Error in POST /api/auth/register:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Gagal memproses pendaftaran: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
