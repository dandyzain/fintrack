import { isProduction } from "./config";
import { log } from "./logger";

/**
 * Transactional email through Resend's HTTP API (RESEND_API_KEY + EMAIL_FROM).
 * Without a provider, development prints the message (including the link) to
 * the server log so the flows can still be tested end to end.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean }> {
  if (!isEmailConfigured()) {
    if (!isProduction()) {
      log.info("email_preview", { to: message.to, subject: message.subject, text: message.text });
    } else {
      log.warn("email_not_configured", { subject: message.subject });
    }
    return { delivered: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    log.error("email_send_failed", { status: res.status, subject: message.subject });
    return { delivered: false };
  }
  return { delivered: true };
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Minimal, client-safe HTML layout for a one-button email. */
export function actionEmail(opts: { name: string; intro: string; action: string; url: string; outro: string }): Pick<EmailMessage, "text" | "html"> {
  const text = `Halo ${opts.name},\n\n${opts.intro}\n\n${opts.action}: ${opts.url}\n\n${opts.outro}\n\n— FinTrack`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="font-size:18px;font-weight:bold;margin:0 0 16px">FinTrack</p>
<p style="margin:0 0 12px">Halo ${escapeHtml(opts.name)},</p>
<p style="margin:0 0 24px;line-height:1.5">${escapeHtml(opts.intro)}</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(opts.url)}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block;font-weight:bold">${escapeHtml(opts.action)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5">${escapeHtml(opts.outro)}</p>
<p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all">${escapeHtml(opts.url)}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}
