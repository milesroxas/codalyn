import { Resend } from "resend";

const TRANSACTIONAL_EMAIL_SENDER_NAME = "Miles at Codalyn";

/** Applies a consistent inbox display name; `RESEND_FROM` may be a bare address or `Name <addr>`. */
function formatTransactionalEmailFrom(raw: string): string {
  const trimmed = raw.trim();
  const angleMatch = /^[^<]*<([^>]+)>$/.exec(trimmed);
  const email = (angleMatch ? angleMatch[1] : trimmed).trim();
  if (!email.includes("@")) {
    throw new Error(
      'RESEND_FROM must be an email address or "Name <addr>" (display name is always "Miles at Codalyn")'
    );
  }
  return `${TRANSACTIONAL_EMAIL_SENDER_NAME} <${email}>`;
}

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
  const fromRaw = process.env.RESEND_FROM?.trim();
  if (!fromRaw) {
    throw new Error(
      'RESEND_FROM is required when RESEND_API_KEY is set (e.g. mail@yourdomain.com; inbox name is "Miles at Codalyn")'
    );
  }
  const from = formatTransactionalEmailFrom(fromRaw);
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
