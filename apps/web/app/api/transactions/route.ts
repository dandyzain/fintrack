import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction.service";
import { getCurrentUserId } from "@/lib/auth";
import { CreateTransactionSchema, TransactionQuerySchema, type ApiResponse } from "@fintrack/shared";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    const { searchParams } = new URL(request.url);

    const queryInput = {
      userId,
      walletId: searchParams.get("walletId") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      type: (searchParams.get("type") as "EXPENSE" | "INCOME") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      search: searchParams.get("search") || undefined,
      hasReceipt: (searchParams.get("hasReceipt") as "true" | "false") || undefined,
      sortBy: (searchParams.get("sortBy") as any) || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20,
    };

    const validatedQuery = TransactionQuerySchema.safeParse(queryInput);
    if (!validatedQuery.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Parameter query transaksi tidak valid.",
          details: validatedQuery.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await TransactionService.getTransactions({
      ...validatedQuery.data,
      userId,
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/transactions:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Gagal mengambil daftar transaksi: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    const body = await request.json();

    const validatedBody = CreateTransactionSchema.safeParse(body);
    if (!validatedBody.success) {
      const issueDetails = validatedBody.error.issues
        .map((i) => `${i.path.join(".") || "transaksi"}: ${i.message}`)
        .join(", ");
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Data transaksi tidak valid: ${issueDetails}`,
          details: validatedBody.error.format(),
        },
        { status: 400 }
      );
    }

    const transaction = await TransactionService.createTransaction({
      ...validatedBody.data,
      userId,
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: transaction,
        message: "Transaksi berhasil dicatat dan saldo dompet telah diperbarui secara atomik.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/transactions:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Gagal menyimpan transaksi: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
