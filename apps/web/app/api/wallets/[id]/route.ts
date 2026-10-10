import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@fintrack/database";
import { getCurrentUserId } from "@/lib/auth";
import type { ApiResponse } from "@fintrack/shared";
import { demoStore } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId(request);
  const walletId = params.id;

  if (!walletId) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "ID kantong wajib disertakan." },
      { status: 400 }
    );
  }

  if (!process.env.DATABASE_URL) {
    try {
      demoStore.deleteWallet(userId, walletId);
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Kantong berhasil dihapus.",
      });
    } catch (err) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: (err as Error).message },
        { status: 400 }
      );
    }
  }

  try {
    const userWalletsCount = await prisma.wallet.count({ where: { userId } });
    if (userWalletsCount <= 1) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Tidak dapat menghapus kantong terakhir. Akun Anda harus memiliki minimal satu kantong.",
        },
        { status: 400 }
      );
    }

    await prisma.transaction.deleteMany({
      where: { walletId, userId },
    });

    await prisma.wallet.delete({
      where: { id: walletId, userId },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Kantong berhasil dihapus.",
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
