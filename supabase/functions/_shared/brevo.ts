export type BrevoEmailPayload = {
  sender?: { email?: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: { email: string; name?: string };
  tags?: string[];
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function sendBrevoEmail(payload: BrevoEmailPayload) {
  const apiKey = Deno.env.get('BREVO_API_KEY')?.trim();
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')?.trim() || payload.sender?.email?.trim();
  const senderName =
    Deno.env.get('BREVO_SENDER_NAME')?.trim() ||
    payload.sender?.name?.trim() ||
    'Turuturu Stars';

  if (!apiKey || !senderEmail) {
    throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      sender: {
        email: senderEmail,
        name: senderName,
      },
    }),
  });

  if (!response.ok) {
    let details: unknown = null;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    console.error('Brevo send failed', details);
    throw new Error(`Brevo rejected the email request (${response.status})`);
  }

  return response.json() as Promise<{ messageId?: string }>;
}
