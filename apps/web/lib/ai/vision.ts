import { ReceiptExtractionSchema, type ReceiptExtraction } from "@fintrack/shared";

const GEMINI_SYSTEM_INSTRUCTION =
  "Ekstrak rincian struk belanja ini ke format JSON murni sesuai skema Zod. Normalisasi angka tanpa titik pemisah ribuan. Jangan sertakan teks markdown pembuka/penutup.";

const GEMINI_SCHEMA_GUIDANCE = `
Format JSON yang diharapkan:
{
  "merchantName": string atau null,
  "date": "YYYY-MM-DD" atau null,
  "totalAmount": number (positif tanpa titik pemisah ribuan),
  "tax": number (default 0),
  "serviceCharge": number (default 0),
  "items": [
    {
      "name": string,
      "price": number (positif tanpa titik pemisah ribuan),
      "quantity": integer (positif, default 1)
    }
  ],
  "suggestedCategory": "Makanan & Minuman" | "Belanja Bulanan" | "Transportasi" | "Kesehatan" | "Hiburan" | "Lainnya"
}
`;

/**
 * Clean potential markdown wraps or formatting quirks from LLM responses
 */
function cleanJsonResponse(rawText: string): string {
  let cleaned = rawText.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith("```")) {
    const lines = cleaned.split("\n");
    if (lines[0].startsWith("```")) {
      lines.shift();
    }
    if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) {
      lines.pop();
    }
    cleaned = lines.join("\n").trim();
  }

  // Find opening and closing curly braces
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

/**
 * Normalizes numbers that might have been serialized with strings or thousand separators
 */
function normalizeExtractedData(data: Record<string, unknown>): Record<string, unknown> {
  const parseNum = (val: unknown): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      // Remove currency symbols, commas and Indonesian thousand separators
      const sanitized = val.replace(/[^0-9.-]/g, "");
      const parsed = parseFloat(sanitized);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const normalized = { ...data };

  if (normalized.totalAmount !== undefined) {
    normalized.totalAmount = parseNum(normalized.totalAmount);
  }
  if (normalized.tax !== undefined) {
    normalized.tax = parseNum(normalized.tax);
  }
  if (normalized.serviceCharge !== undefined) {
    normalized.serviceCharge = parseNum(normalized.serviceCharge);
  }

  if (Array.isArray(normalized.items)) {
    normalized.items = normalized.items.map((item) => {
      if (typeof item === "object" && item !== null) {
        const itemObj = item as Record<string, unknown>;
        return {
          name: typeof itemObj.name === "string" ? itemObj.name.trim() : "Item",
          price: parseNum(itemObj.price),
          quantity: typeof itemObj.quantity === "number" ? Math.max(1, Math.round(itemObj.quantity)) : 1,
        };
      }
      return item;
    });
  }

  return normalized;
}

/**
 * Extract receipt data using Google Gemini Flash API
 */
export async function extractReceiptWithGemini(
  imageBuffer: Buffer | Uint8Array,
  mimeType: string
): Promise<ReceiptExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const base64Image = Buffer.from(imageBuffer).toString("base64");
  // `gemini-flash-latest` always points at Google's current Flash model, so the
  // app keeps working when a specific version (e.g. gemini-1.5-flash) is retired.
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${GEMINI_SYSTEM_INSTRUCTION}\n\n${GEMINI_SCHEMA_GUIDANCE}`,
          },
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Key in a header, not the URL, so it never ends up in proxy or access logs.
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const errorText = (await response.text()).slice(0, 500);
    throw new Error(`Google Gemini API error (${response.status}, model ${modelName}): ${errorText}`);
  }

  const result = await response.json();
  const candidate = result.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text;

  if (!responseText) {
    throw new Error("Tidak ada respons teks yang dihasilkan dari Google Gemini API.");
  }

  const cleanedText = cleanJsonResponse(responseText);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanedText);
  } catch (err) {
    throw new Error(`Gagal membaca respons model sebagai format JSON: ${(err as Error).message}`);
  }

  const normalizedData = normalizeExtractedData(parsedJson as Record<string, unknown>);
  const validated = ReceiptExtractionSchema.safeParse(normalizedData);

  if (!validated.success) {
    const errorIssues = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Validasi schema ekstraksi struk gagal: ${errorIssues}`);
  }

  return validated.data;
}

/**
 * Fallback extractor using OpenAI Vision API if configured
 */
export async function extractReceiptWithOpenAI(
  imageBuffer: Buffer | Uint8Array,
  mimeType: string
): Promise<ReceiptExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not configured.");
  }

  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64Image}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${GEMINI_SYSTEM_INSTRUCTION}\n\n${GEMINI_SCHEMA_GUIDANCE}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Berikut struk transaksi yang harus diekstrak:" },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = (await response.text()).slice(0, 500);
    throw new Error(`OpenAI Vision API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("Respons kosong dari OpenAI Vision API.");
  }

  const cleanedText = cleanJsonResponse(rawContent);
  const parsedJson = JSON.parse(cleanedText);
  const normalizedData = normalizeExtractedData(parsedJson);
  const validated = ReceiptExtractionSchema.safeParse(normalizedData);

  if (!validated.success) {
    const errorIssues = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Validasi skema ekstraksi OpenAI gagal: ${errorIssues}`);
  }

  return validated.data;
}

/** Thrown when no extraction engine is configured (maps to HTTP 503). */
export class VisionNotConfiguredError extends Error {
  constructor() {
    super("Vision AI belum dikonfigurasi. Sediakan GEMINI_API_KEY atau OPENAI_API_KEY, atau aktifkan ENABLE_MOCK_AI=true untuk demo.");
    this.name = "VisionNotConfiguredError";
  }
}

export function isMockVisionEnabled(): boolean {
  return process.env.ENABLE_MOCK_AI === "true";
}

const MOCK_EXTRACTION: ReceiptExtraction = {
  merchantName: "Supermarket Segar Jaya",
  date: null,
  totalAmount: 145000,
  tax: 14500,
  serviceCharge: 0,
  items: [
    { name: "Susu UHT Full Cream 1L", price: 24000, quantity: 2 },
    { name: "Roti Gandum Utuh", price: 18000, quantity: 1 },
    { name: "Daging Ayam Fillet 500g", price: 42000, quantity: 1 },
    { name: "Telur Ayam Negeri 10 Butir", price: 37000, quantity: 1 },
  ],
  suggestedCategory: "Belanja Bulanan",
};

/**
 * Primary Vision AI dispatcher: Gemini, then OpenAI as fallback. The mock
 * extractor is used only when explicitly enabled (ENABLE_MOCK_AI=true) and no
 * real key is configured — it is opt-in, so it also works for a hosted demo.
 */
export async function extractReceiptFromImage(
  imageBuffer: Buffer | Uint8Array,
  mimeType: string
): Promise<ReceiptExtraction> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await extractReceiptWithGemini(imageBuffer, mimeType);
    } catch (geminiError) {
      if (process.env.OPENAI_API_KEY) {
        console.warn("Gemini extraction failed; falling back to OpenAI:", (geminiError as Error).message);
        return await extractReceiptWithOpenAI(imageBuffer, mimeType);
      }
      throw geminiError;
    }
  }

  if (process.env.OPENAI_API_KEY) {
    return await extractReceiptWithOpenAI(imageBuffer, mimeType);
  }

  if (isMockVisionEnabled()) {
    return { ...MOCK_EXTRACTION, date: new Date().toISOString().split("T")[0], items: MOCK_EXTRACTION.items.map((i) => ({ ...i })) };
  }

  throw new VisionNotConfiguredError();
}
