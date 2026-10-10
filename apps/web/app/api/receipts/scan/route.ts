import { NextRequest, NextResponse } from "next/server";
import { uploadReceiptToStorage } from "@/lib/storage/supabase";
import { extractReceiptFromImage } from "@/lib/ai/vision";
import { ReceiptExtractionSchema, type ApiResponse } from "@fintrack/shared";

// Max upload size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Content-Type request harus berupa multipart/form-data.",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    // Accept file from field 'file', 'receipt', or 'image'
    const file =
      (formData.get("file") as File | null) ||
      (formData.get("receipt") as File | null) ||
      (formData.get("image") as File | null);

    if (!file) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "File struk tidak ditemukan. Pastikan field bernama 'file', 'receipt', atau 'image'.",
        },
        { status: 400 }
      );
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Format file tidak didukung: ${file.type}. Gunakan format gambar JPG, PNG, atau WebP.`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Ukuran file melebihi batas maksimum 10MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        },
        { status: 400 }
      );
    }

    const userId = (formData.get("userId") as string | null) || "anonymous";

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Supabase Storage Bucket ('receipts')
    let storageResult;
    try {
      storageResult = await uploadReceiptToStorage(
        buffer,
        file.name || "receipt.jpg",
        file.type || "image/jpeg",
        userId
      );
    } catch (storageErr) {
      console.error("Storage upload error:", storageErr);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Gagal mengunggah struk ke media penyimpanan: ${(storageErr as Error).message}`,
        },
        { status: 500 }
      );
    }

    // 2. Invoke Vision LLM AI Extraction Engine
    let extractedData;
    try {
      extractedData = await extractReceiptFromImage(buffer, file.type || "image/jpeg");
    } catch (aiErr) {
      console.error("Vision AI extraction error:", aiErr);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Gagal memproses struk dengan Vision AI: ${(aiErr as Error).message}`,
        },
        { status: 422 }
      );
    }

    // 3. Validate extraction contract using Zod schema
    const validationResult = ReceiptExtractionSchema.safeParse(extractedData);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.format();
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Hasil ekstraksi AI tidak memenuhi skema kontrak data.",
          details: errorDetails,
        },
        { status: 422 }
      );
    }

    // 4. Return extracted data for User Review & Confirmation
    // CRITICAL: We do NOT persist directly to database here. The client must review first!
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          extractedData: validationResult.data,
          receiptImageUrl: storageResult.publicUrl,
          storagePath: storageResult.storagePath,
          fileName: file.name,
          fileSize: file.size,
        },
        message: "Struk belanja berhasil diekstrak. Silakan periksa dan konfirmasi data transaksi.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in /api/receipts/scan:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Terjadi kesalahan internal pada server: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
