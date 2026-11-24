import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@fintrack/database";
import { getCurrentUserId } from "@/lib/auth";
import type { ApiResponse } from "@fintrack/shared";
import { demoStore } from "@/lib/demo-store";
import { internalErrorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!process.env.DATABASE_URL) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: demoStore.getCategories(userId),
      });
    }

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: categories,
    });
  } catch (error) {
    return internalErrorResponse("GET /api/categories", error);
  }
}
