type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
};

type ResendEmailResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export function hasResendEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export function assertResendEmailConfig() {
  if (!hasResendEmailConfig()) {
    throw new Error(
      "Reminder email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }
}

export async function sendEmailViaResend(input: SendEmailInput) {
  assertResendEmailConfig();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "therapyflow/0.1",
      ...(input.idempotencyKey
        ? {
            "Idempotency-Key": input.idempotencyKey,
          }
        : {}),
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: process.env.RESEND_REPLY_TO_EMAIL || undefined,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ResendEmailResponse;

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.name ||
        `Resend request failed with status ${response.status}.`,
    );
  }

  return payload;
}
