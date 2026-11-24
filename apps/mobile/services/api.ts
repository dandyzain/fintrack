import {
  ReceiptExtractionSchema,
  CreateTransactionSchema,
  type ApiResponse,
  type ReceiptExtraction,
  type CreateTransactionInput,
  type DashboardAnalyticsResponse,
  type AuthUser,
  type AuthResponseData,
} from "@fintrack/shared";

// Base URL: In Android Emulator use 10.0.2.2, in iOS simulator or physical device use LAN IP
const DEFAULT_API_URL = "http://10.0.2.2:3000";
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

let currentAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

let unauthorizedHandler: (() => void) | null = null;

/**
 * Registers a callback invoked when an authenticated request gets a 401
 * (expired/invalid session). AuthContext uses it to log out, which sends the
 * user back to the login screen.
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/**
 * fetch() for authenticated endpoints. On 401 it notifies the unauthorized
 * handler, but only if the token that was rejected is still the current one, so
 * a slow request from a previous session can't log out a fresh login.
 *
 * Not used for login/register, where a 401 just means wrong credentials.
 */
async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const tokenUsed = currentAuthToken;
  const response = await fetch(url, init);
  if (response.status === 401 && tokenUsed === currentAuthToken) {
    unauthorizedHandler?.();
  }
  return response;
}

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...customHeaders,
  };
  if (currentAuthToken) {
    headers["Authorization"] = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

export interface UploadReceiptResponse {
  extractedData: ReceiptExtraction;
  receiptImageUrl: string;
  storagePath: string;
  fileName: string;
}

/**
 * Login user via email and password
 */
export async function loginApi(
  email: string,
  password: string
): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const json: ApiResponse<AuthResponseData> = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || "Email atau kata sandi tidak cocok.");
  }

  setAuthToken(json.data.token);
  return json.data;
}

/**
 * Register a new user
 */
export async function registerApi(
  name: string,
  email: string,
  password: string
): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  const json: ApiResponse<AuthResponseData> = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || "Gagal melakukan pendaftaran akun.");
  }

  setAuthToken(json.data.token);
  return json.data;
}

/**
 * Get current session user profile
 */
export async function getMeApi(): Promise<AuthUser> {
  const response = await authFetch(`${API_BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders(),
  });

  const json: ApiResponse<{ user: AuthUser }> = await response.json();
  if (!response.ok || !json.success || !json.data?.user) {
    throw new Error(json.error || "Sesi tidak valid atau telah kedaluwarsa.");
  }

  return json.data.user;
}

/**
 * Uploads compressed receipt image to backend scan endpoint
 */
export async function scanReceiptApi(
  fileUri: string,
  fileName: string = "receipt.jpg",
  mimeType: string = "image/jpeg"
): Promise<UploadReceiptResponse> {
  const formData = new FormData();

  // React Native FormData format:
  // @ts-expect-error React Native requires uri, name, type for file uploads
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  });

  const response = await authFetch(`${API_BASE_URL}/api/receipts/scan`, {
    method: "POST",
    body: formData,
    headers: getAuthHeaders(),
  });

  const json: ApiResponse<UploadReceiptResponse> = await response.json();

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || "Gagal memindai struk dengan Vision AI.");
  }

  // Double check client-side validation using shared Zod schema
  const validated = ReceiptExtractionSchema.safeParse(json.data.extractedData);
  if (!validated.success) {
    throw new Error("Format respons Vision AI tidak sesuai kontrak data.");
  }

  return json.data;
}

/**
 * Creates transaction in database with atomic wallet update
 */
export async function createTransactionApi(
  input: CreateTransactionInput
): Promise<ApiResponse> {
  const validated = CreateTransactionSchema.safeParse(input);
  if (!validated.success) {
    throw new Error("Validasi data transaksi gagal sebelum dikirim.");
  }

  const response = await authFetch(`${API_BASE_URL}/api/transactions`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(validated.data),
  });

  const json: ApiResponse = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Gagal menyimpan transaksi.");
  }

  return json;
}

/**
 * Fetches dashboard analytics
 */
export async function fetchAnalyticsApi(): Promise<DashboardAnalyticsResponse> {
  const response = await authFetch(`${API_BASE_URL}/api/analytics`, {
    headers: getAuthHeaders(),
  });

  const json: ApiResponse<DashboardAnalyticsResponse> = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || "Gagal mengambil data analitik.");
  }

  return json.data;
}

/**
 * Fetches user wallets
 */
export async function fetchWalletsApi() {
  const response = await authFetch(`${API_BASE_URL}/api/wallets`, {
    headers: getAuthHeaders(),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Gagal mengambil daftar dompet.");
  }

  return json.data;
}

/**
 * Creates a new wallet/pocket
 */
export async function createWalletApi(name: string, balance: number = 0) {
  const response = await authFetch(`${API_BASE_URL}/api/wallets`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ name, balance }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Gagal membuat kantong baru.");
  }

  return json.data;
}

/**
 * Deletes a wallet/pocket
 */
export async function deleteWalletApi(walletId: string) {
  const response = await authFetch(`${API_BASE_URL}/api/wallets?id=${walletId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Gagal menghapus kantong.");
  }

  return json;
}

/**
 * Fetches categories
 */
export async function fetchCategoriesApi() {
  const response = await authFetch(`${API_BASE_URL}/api/categories`, {
    headers: getAuthHeaders(),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Gagal mengambil daftar kategori.");
  }

  return json.data;
}

export interface TransactionFilterParams {
  limit?: number;
  walletId?: string;
  categoryId?: string;
  type?: "EXPENSE" | "INCOME";
  startDate?: string;
  endDate?: string;
  search?: string;
  hasReceipt?: boolean | string;
  sortBy?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
}

/**
 * Fetches transactions list with optional filters
 */
export async function fetchTransactionsApi(
  params?: number | TransactionFilterParams
) {
  let url = `${API_BASE_URL}/api/transactions`;

  if (typeof params === "number") {
    url += `?limit=${params}`;
  } else if (params && typeof params === "object") {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append("limit", String(params.limit));
    if (params.walletId) searchParams.append("walletId", params.walletId);
    if (params.categoryId) searchParams.append("categoryId", params.categoryId);
    if (params.type) searchParams.append("type", params.type);
    if (params.startDate) searchParams.append("startDate", params.startDate);
    if (params.endDate) searchParams.append("endDate", params.endDate);
    if (params.search) searchParams.append("search", params.search);
    if (params.hasReceipt !== undefined) searchParams.append("hasReceipt", String(params.hasReceipt));
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);

    const queryString = searchParams.toString();
    if (queryString) url += `?${queryString}`;
  } else {
    url += `?limit=20`;
  }

  const response = await authFetch(url, {
    headers: getAuthHeaders(),
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || "Gagal mengambil daftar transaksi.");
  }

  return json.data.items || [];
}
