import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/csv";
import { HttpError } from "@/lib/server/errors";
import {
  detectImageType,
  normalizeReceiptRef,
  readMemoryReceipt,
  resolveReceiptUrl,
  uploadReceipt,
  verifyMemoryReceiptLink,
} from "@/lib/server/receipts";

const USER = "11111111-2222-3333-4444-555555555555";

describe("receipt references", () => {
  it("accepts the user's own paths and our signed/public URLs", () => {
    const path = `${USER}/1700000000000-abc.jpg`;
    expect(normalizeReceiptRef(path, USER)).toBe(path);
    expect(normalizeReceiptRef(`https://p.supabase.co/storage/v1/object/sign/receipts/${path}?token=x`, USER)).toBe(path);
    expect(normalizeReceiptRef(`https://p.supabase.co/storage/v1/object/public/receipts/${path}`, USER)).toBe(path);
    expect(normalizeReceiptRef(`/api/receipts/file?p=${encodeURIComponent(path)}&e=1&s=x`, USER)).toBe(path);
    expect(normalizeReceiptRef("", USER)).toBeNull();
  });

  it("rejects other users' files, traversal and foreign URLs", () => {
    for (const bad of [
      `99999999-2222-3333-4444-555555555555/x.jpg`,
      `${USER}/../other/x.jpg`,
      "https://evil.example.com/x.jpg",
      "javascript:alert(1)",
    ]) {
      expect(() => normalizeReceiptRef(bad, USER)).toThrow(HttpError);
    }
  });

  it("detects images by content, not by declared type", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(detectImageType(Buffer.from("89504e470d0a1a0a0000000d", "hex"))).toBe("image/png");
    expect(detectImageType(Buffer.from("RIFF0000WEBPVP8 "))).toBe("image/webp");
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });

  it("serves memory receipts only through valid, unexpired signed links", async () => {
    const path = await uploadReceipt(USER, Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg");
    expect(path.startsWith(`${USER}/`)).toBe(true);
    const url = new URL((await resolveReceiptUrl(path))!, "http://x");
    const [p, e, s] = ["p", "e", "s"].map((k) => url.searchParams.get(k)!);
    expect(verifyMemoryReceiptLink(p, Number(e), s)).toBe(true);
    expect(verifyMemoryReceiptLink(p, Number(e) + 1, s)).toBe(false);
    expect(verifyMemoryReceiptLink(p, Math.floor(Date.now() / 1000) - 10, s)).toBe(false);
    expect(readMemoryReceipt(p)?.contentType).toBe("image/jpeg");
  });
});

describe("csv", () => {
  it("neutralises spreadsheet formulas and quotes separators", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+62 812")).toBe("'+62 812");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("Kopi, Roti")).toBe('"Kopi, Roti"');
    expect(csvCell(-50000)).toBe("-50000");
    expect(csvCell(null)).toBe("");
  });
});
