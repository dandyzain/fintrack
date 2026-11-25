import { NextResponse, type NextRequest } from "next/server";
import { readMemoryReceipt, verifyMemoryReceiptLink } from "@/lib/server/receipts";

export const dynamic = "force-dynamic";

/** Serves receipts kept in memory mode, only through a valid signed, unexpired link. */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const path = p.get("p") ?? "";
  const exp = Number(p.get("e"));
  const sig = p.get("s") ?? "";
  if (!verifyMemoryReceiptLink(path, exp, sig)) return new NextResponse("Not found", { status: 404 });
  const file = readMemoryReceipt(path);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
