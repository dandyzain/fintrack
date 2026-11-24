import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction.service";
import { getCurrentUserId } from "@/lib/auth";
import { databaseErrorResponse } from "@/lib/api-errors";
import { UpdateTransactionSchema, type ApiResponse } from "@fintrack/shared";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId(request);
    const transaction = await TransactionService.getTransactionById(params.id, userId);

    if (!transaction) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: transaction });
  } catch (error) {
    const dbErrorResponse = databaseErrorResponse("GET /api/transactions/[id]", error);
    if (dbErrorResponse) return dbErrorResponse;

    return NextResponse.json<ApiResponse>(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId(request);
    const body = await request.json();

    const validated = UpdateTransactionSchema.safeParse({
      ...body,
      id: params.id,
    });

    if (!validated.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Validasi update transaksi gagal.",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await TransactionService.updateTransaction({
      ...validated.data,
      userId,
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updated,
      message: "Transaksi berhasil diperbarui dan penyesuaian saldo dompet telah disinkronkan.",
    });
  } catch (error) {
    const dbErrorResponse = databaseErrorResponse("PUT /api/transactions/[id]", error);
    if (dbErrorResponse) return dbErrorResponse;

    return NextResponse.json<ApiResponse>(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId(request);
    const result = await TransactionService.deleteTransaction(params.id, userId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: "Transaksi berhasil dihapus dan saldo dompet telah dikembalikan secara atomik.",
    });
  } catch (error) {
    const dbErrorResponse = databaseErrorResponse("DELETE /api/transactions/[id]", error);
    if (dbErrorResponse) return dbErrorResponse;

    return NextResponse.json<ApiResponse>(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
