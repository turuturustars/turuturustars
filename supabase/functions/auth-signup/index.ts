import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse } from "../_shared/http.ts";
import { escapeHtml, sendBrevoEmail } from "../_shared/brevo.ts";

type SignupRequest = {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  idNumber?: string;
  location?: string;
  occupation?: string;
  captchaToken?: string;
  redirectTo?: string;
};

const DEFAULT_SITE_URL = "https://turuturustars.co.ke";
const SUPPORT_EMAIL = "support@turuturustars.co.ke";
const PHONE_ALREADY_REGISTERED_MESSAGE =
  "This phone number is already registered. Sign in with that number or use another phone number.";

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new HttpError(500, "Missing Supabase service credentials");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeKenyanPhone(rawPhone: string): string | null {
  const digits = rawPhone.trim().replace(/\D/g, "");
  if (/^0[17][0-9]{8}$/.test(digits)) {
    return `+254${digits.slice(1)}`;
  }
  if (/^254[17][0-9]{8}$/.test(digits)) {
    return `+${digits}`;
  }
  return null;
}

async function findRegisteredProfileByPhone(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  phone: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .or("soft_deleted.is.null,soft_deleted.eq.false")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Unable to verify whether this phone number is already registered.", error);
  }

  return data?.id ? { id: data.id as string } : null;
}

async function ensurePhoneNotRegistered(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  phone: string,
): Promise<void> {
  const existingProfile = await findRegisteredProfileByPhone(supabaseAdmin, phone);
  if (existingProfile) {
    throw new HttpError(409, PHONE_ALREADY_REGISTERED_MESSAGE);
  }
}

async function verifyTurnstileToken(token: string, req: Request): Promise<boolean> {
  const secret =
    Deno.env.get("TURNSTILE_SECRET_KEY") ||
    Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY") ||
    Deno.env.get("CAPTCHA_SECRET") ||
    "";

  if (!secret) {
    throw new HttpError(500, "Turnstile secret is missing in edge function secrets.");
  }

  const payload = new URLSearchParams();
  payload.set("secret", secret);
  payload.set("response", token);

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp) {
    payload.set("remoteip", clientIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
  });

  if (!response.ok) {
    throw new HttpError(502, `Cloudflare verification request failed (${response.status}).`);
  }

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

const buildSignupEmail = (params: {
  actionLink: string;
  email: string;
  fullName?: string;
}) => {
  const displayName = params.fullName?.trim() || "there";
  const safeName = escapeHtml(displayName);
  const safeEmail = escapeHtml(params.email);
  const safeLink = escapeHtml(params.actionLink);

  return {
    subject: "Confirm your Turuturu Stars account",
    textContent:
      `Hi ${displayName},\n\n` +
      `Confirm your email address to finish creating your Turuturu Stars account:\n` +
      `${params.actionLink}\n\n` +
      `This message was sent to ${params.email}. If you did not request it, you can ignore it.\n\n` +
      `Turuturu Stars`,
    htmlContent: `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;font-weight:700;">Turuturu Stars</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f172a;">Confirm your account</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;">Confirm your email address to finish creating your Turuturu Stars member account.</p>
                <p style="margin:0 0 24px;">
                  <a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Confirm email</a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#475569;">This message was sent to ${safeEmail}. If you did not request it, you can ignore it.</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">If the button does not work, copy and paste this link into your browser:<br><a href="${safeLink}" style="color:#2563eb;word-break:break-all;">${safeLink}</a></p>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#64748b;">Need help? Contact ${SUPPORT_EMAIL}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    let body: SignupRequest;
    try {
      body = (await req.json()) as SignupRequest;
    } catch {
      throw new HttpError(400, "Invalid JSON payload");
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const normalizedPhone = rawPhone ? normalizeKenyanPhone(rawPhone) : null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "Use a valid email address.");
    }
    if (password.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters.");
    }
    if (!normalizedPhone) {
      throw new HttpError(400, "Enter a valid Kenyan mobile number.");
    }
    if (!captchaToken) {
      throw new HttpError(400, "Complete Cloudflare verification first.");
    }

    const captchaVerified = await verifyTurnstileToken(captchaToken, req);
    if (!captchaVerified) {
      throw new HttpError(400, "Cloudflare verification failed. Retry and submit again.");
    }

    const redirectTo =
      typeof body.redirectTo === "string" && body.redirectTo.trim()
        ? body.redirectTo.trim()
        : `${DEFAULT_SITE_URL}/auth/callback`;

    const supabaseAdmin = createAdminClient();
    await ensurePhoneNotRegistered(supabaseAdmin, normalizedPhone);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: {
          full_name: body.fullName || "",
          phone: normalizedPhone,
          id_number: body.idNumber || "",
          location: body.location || "",
          occupation: body.occupation || "",
        },
      },
    });

    if (error) {
      const existingProfile = await findRegisteredProfileByPhone(supabaseAdmin, normalizedPhone);
      if (existingProfile) {
        throw new HttpError(409, PHONE_ALREADY_REGISTERED_MESSAGE);
      }

      const message = error.message || "Unable to create account.";
      const status =
        message.toLowerCase().includes("already") || message.toLowerCase().includes("registered")
          ? 409
          : 400;
      throw new HttpError(status, message);
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      throw new HttpError(500, "Unable to generate confirmation link.");
    }

    const emailContent = buildSignupEmail({
      actionLink,
      email,
      fullName: body.fullName,
    });
    const replyToEmail = Deno.env.get("BREVO_REPLY_TO_EMAIL")?.trim();
    const replyToName = Deno.env.get("BREVO_REPLY_TO_NAME")?.trim();
    const brevoData = await sendBrevoEmail({
      to: [{ email, name: body.fullName || undefined }],
      subject: emailContent.subject,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
      replyTo: replyToEmail ? { email: replyToEmail, name: replyToName || undefined } : undefined,
      tags: ["turuturu-stars", "signup"],
    });

    return jsonResponse({
      success: true,
      requiresEmailVerification: true,
      existingUserHint: false,
      user: {
        id: data?.user?.id || null,
        email,
      },
      brevoMessageId: brevoData.messageId || null,
    });
  } catch (error) {
    console.error("auth-signup failed", error instanceof Error ? error.message : error);
    return errorResponse(error);
  }
});
