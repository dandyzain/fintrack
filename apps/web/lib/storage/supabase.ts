import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(rawUrl && rawKey);

const supabaseUrl = rawUrl || "https://placeholder-project.supabase.co";
const supabaseServiceKey = rawKey || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface UploadReceiptResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Uploads a receipt image buffer to Supabase Storage bucket 'receipts'
 */
export async function uploadReceiptToStorage(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  userId: string = "anonymous"
): Promise<UploadReceiptResult> {
  const bucketName = process.env.SUPABASE_RECEIPT_BUCKET || "receipts";

  // Sanitize file name and create a timestamped unique path
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  const storagePath = `${userId}/${timestamp}-${sanitizedName}`;

  // If Supabase credentials are not configured (e.g. in test/dev mock mode), provide fallback handling
  if (!isSupabaseConfigured) {
    console.warn("Supabase credentials missing. Returning local placeholder URL.");
    return {
      publicUrl: `/uploads/receipts/${storagePath}`,
      storagePath,
    };
  }

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah struk ke Supabase Storage: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(storagePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Gagal memperoleh URL publik gambar struk dari Supabase.");
  }

  return {
    publicUrl: publicUrlData.publicUrl,
    storagePath,
  };
}
