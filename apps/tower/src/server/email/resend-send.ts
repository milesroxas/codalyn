import { Resend } from "resend";

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return null;
  }
  return new Resend(key);
}

/**
 * Sends a single transactional email via Resend.
 * When `RESEND_API_KEY` is unset, logs once and returns without sending (local dev).
 */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[tower/email] RESEND_API_KEY missing; skipping transactional send");
    return;
  }
  const from = process.env.RESEND_FROM?.trim();
  if (!from) {
    throw new Error("RESEND_FROM is required when RESEND_API_KEY is set (e.g. Tower <mail@yourdomain.com>)");
  }
  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
  });
  if (error) {
    throw new Error(error.message);
  }
}
