/**
 * Browser-side fetch wrapper for authenticated FinTrack API routes.
 *
 * A 401 means the session is missing, expired, or was signed with a secret the
 * server no longer accepts (e.g. after SESSION_SECRET was set or rotated). The
 * server has already expired the cookie, so send the user to the login page and
 * stop the caller from processing the error body.
 *
 * Do NOT use this for /api/auth/login or /api/auth/register: there a 401 means
 * "wrong credentials" and must be shown on the form.
 */

export class UnauthorizedError extends Error {
  constructor() {
    super("Sesi telah berakhir. Silakan masuk kembali.");
    this.name = "UnauthorizedError";
  }
}

let redirectingToLogin = false;

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    if (typeof window !== "undefined" && !redirectingToLogin) {
      redirectingToLogin = true;
      window.location.replace("/login");
    }
    throw new UnauthorizedError();
  }

  return response;
}
