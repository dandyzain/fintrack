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
        data: demoStore.getWallets(userId),
      });
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: wallets,
    });
  } catch (error) {
    return internalErrorResponse("GET /api/wallets", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nama dompet wajib diisi." },
        { status: 400 }
      );
    }

    const initialBalance = typeof body.balance === "number" ? body.balance : 0;

    if (!process.env.DATABASE_URL) {
      const wallet = demoStore.createWallet(userId, body.name.trim(), initialBalance);
      return NextResponse.json<ApiResponse>(
        { success: true, data: wallet, message: "Dompet berhasil dibuat." },
        { status: 201 }
      );
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        name: body.name.trim(),
        balance: initialBalance,
      },
    });

    return NextResponse.json<ApiResponse>(
      { success: true, data: wallet, message: "Dompet berhasil dibuat." },
      { status: 201 }
    );
  } catch (error) {
    return internalErrorResponse("POST /api/wallets", error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get("id");

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

    // Delete related transactions first to prevent foreign key restrict violations
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
    return internalErrorResponse("DELETE /api/wallets", error);
  }
}
