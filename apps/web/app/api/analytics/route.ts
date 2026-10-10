import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction.service";
import { getCurrentUserId } from "@/lib/auth";
import type { ApiResponse, DashboardAnalyticsResponse } from "@fintrack/shared";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : now.getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Parameter bulan (month) harus bernilai antara 1 dan 12." },
        { status: 400 }
      );
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Parameter tahun (year) tidak valid." },
        { status: 400 }
      );
    }

    const analyticsData = await TransactionService.getMonthlyAnalytics(userId, month, year);

    return NextResponse.json<ApiResponse<DashboardAnalyticsResponse>>(
      {
        success: true,
        data: analyticsData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/analytics:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Gagal memproses data analitik: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
