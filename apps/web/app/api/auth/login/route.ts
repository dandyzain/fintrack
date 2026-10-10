import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { LoginSchema, type ApiResponse, type AuthResponseData } from "@fintrack/shared";
import { prisma } from "@fintrack/database";
import { demoStore } from "@/lib/demo-store";
import { signSessionToken, setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = LoginSchema.safeParse(body);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: issue?.message || "Data login tidak valid.",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;
    let authUser: { id: string; name: string; email: string };

    if (!process.env.DATABASE_URL) {
      try {
        authUser = demoStore.loginUser(email, password);
      } catch (err) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: (err as Error).message },
          { status: 401 }
        );
      }
    } else {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Email atau kata sandi tidak cocok." },
            { status: 401 }
          );
        }

        const [salt, storedHash] = user.passwordHash.split(":");
        const testHash = crypto
          .pbkdf2Sync(password, salt, 1000, 64, "sha512")
          .toString("hex");

        if (testHash !== storedHash) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Email atau kata sandi tidak cocok." },
            { status: 401 }
          );
        }

        authUser = {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      } catch (err) {
        // Fallback to demo store if DB fails
        try {
          authUser = demoStore.loginUser(email, password);
        } catch (subErr) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Email atau kata sandi tidak cocok." },
            { status: 401 }
          );
        }
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
        message: "Login berhasil. Selamat datang kembali!",
      },
      { status: 200 }
    );

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
    console.error("Error in POST /api/auth/login:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Gagal memproses login: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
