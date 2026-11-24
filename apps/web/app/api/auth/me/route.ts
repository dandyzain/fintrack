import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { ApiResponse, AuthUser } from "@fintrack/shared";
import { databaseErrorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Sesi tidak ditemukan atau telah kedaluwarsa.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<{ user: AuthUser }>>({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    const dbErrorResponse = databaseErrorResponse("GET /api/auth/me", error);
    if (dbErrorResponse) return dbErrorResponse;

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Gagal memverifikasi sesi: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
