import { ReceiptExtractionSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { HttpError, badRequest, serviceUnavailable } from "@/lib/server/errors";
import { ok } from "@/lib/server/http";
import { log } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { MAX_RECEIPT_BYTES, detectImageType, resolveReceiptUrl, uploadReceipt } from "@/lib/server/receipts";
import { VisionNotConfiguredError, extractReceiptFromImage } from "@/lib/ai/vision";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Extracts a receipt with Vision AI and stores the image privately. Nothing is
 * written to the ledger here: the client reviews the result and then creates
 * the transaction (sending back `receiptImageUrl`).
 */
export const POST = withUser(async (request, { user }) => {
  await enforceRateLimit("scan", user.id);

  if (!(request.headers.get("content-type") || "").includes("multipart/form-data")) {
    throw badRequest("Content-Type harus multipart/form-data.");
  }
  const form = await request.formData();
  const file = (form.get("file") || form.get("receipt") || form.get("image")) as File | null;
  if (!file || typeof file === "string") throw badRequest("File struk tidak ditemukan. Kirim gambar pada field 'file'.");
  if (file.size > MAX_RECEIPT_BYTES) {
    throw badRequest(`Ukuran file melebihi batas 10MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // Trust the file's content, not its declared type (blocks SVG/HTML disguised as images).
  const contentType = detectImageType(bytes);
  if (!contentType) throw badRequest("Format file tidak didukung. Gunakan foto JPG, PNG, WebP, atau HEIC.");

  let extracted;
  try {
    extracted = await extractReceiptFromImage(bytes, contentType);
  } catch (err) {
    if (err instanceof VisionNotConfiguredError) throw serviceUnavailable(err.message, "VISION_NOT_CONFIGURED");
    log.error("vision_extraction_failed", { message: (err as Error).message });
    throw new HttpError(422, "Struk tidak dapat dibaca. Pastikan foto jelas dan seluruh struk terlihat, lalu coba lagi.", "EXTRACTION_FAILED");
  }

  const validated = ReceiptExtractionSchema.safeParse(extracted);
  if (!validated.success) {
    throw new HttpError(422, "Hasil pembacaan struk tidak lengkap. Coba foto ulang atau isi transaksi secara manual.", "EXTRACTION_INVALID");
  }

  // Upload only after a successful extraction, so failed scans leave no orphan files.
  const path = await uploadReceipt(user.id, bytes, contentType);
  const receiptImageUrl = await resolveReceiptUrl(path);

  return ok(
    {
      extractedData: validated.data,
      /** Signed URL for preview; send it back as `receiptImageUrl` when saving the transaction. */
      receiptImageUrl,
      storagePath: path,
      fileName: file.name,
      fileSize: file.size,
    },
    { message: "Struk berhasil dibaca. Periksa dan konfirmasi data transaksi." }
  );
});
