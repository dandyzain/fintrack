import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import type { ApiResponse } from "@fintrack/shared";

export const dynamic = "force-dynamic";

export async function POST() {
  clearSessionCookie();

  const response = NextResponse.json<ApiResponse>({
    success: true,
    message: "Berhasil keluar dari akun.",
  });

  // Explicitly delete cookie on response
  response.cookies.delete("fintrack_session");

  return response;
}
