import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import { escapeHtml, sendBrevoEmail } from '../_shared/brevo.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-invite-secret',
};

interface InviteRequest {
  email: string;
  fullName?: string;
  phone?: string;
  idNumber?: string;
  location?: string;
  occupation?: string;
  employmentStatus?: string;
  interests?: string[];
  educationLevel?: string;
  additionalNotes?: string;
  isStudent?: boolean;
  redirectTo?: string;
  resend?: boolean;
}

const buildInviteEmail = (params: {
  actionLink: string;
  email: string;
  fullName?: string;
  resend?: boolean;
}) => {
  const displayName = params.fullName?.trim() || 'there';
  const safeName = escapeHtml(displayName);
  const safeLink = escapeHtml(params.actionLink);
  const safeEmail = escapeHtml(params.email);
  const title = params.resend ? 'Your Turuturu Stars invite link' : 'Welcome to Turuturu Stars';

  return {
    subject: title,
    textContent:
      `Hi ${displayName},\n\n` +
      `Use this secure link to confirm your email and continue with Turuturu Stars:\n` +
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
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f172a;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;">Confirm your email address to continue with your Turuturu Stars member account.</p>
                <p style="margin:0 0 24px;">
                  <a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Confirm email</a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#475569;">This message was sent to ${safeEmail}. If you did not request it, you can ignore it.</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">If the button does not work, copy and paste this link into your browser:<br><a href="${safeLink}" style="color:#2563eb;word-break:break-all;">${safeLink}</a></p>
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

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const INVITE_FUNCTION_SECRET = Deno.env.get('INVITE_FUNCTION_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!INVITE_FUNCTION_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVITE_FUNCTION_SECRET is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const providedSecret = req.headers.get('x-invite-secret') || '';
    if (providedSecret !== INVITE_FUNCTION_SECRET) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body: InviteRequest = await req.json();
    const {
      email,
      fullName,
      phone,
      idNumber,
      location,
      occupation,
      employmentStatus,
      interests,
      educationLevel,
      additionalNotes,
      isStudent,
      redirectTo,
      resend,
    } = body;

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const emailRedirectUrl = redirectTo || 'https://turuturustars.co.ke/auth/callback';
    const userData = {
      full_name: fullName || '',
      phone: phone || '',
      id_number: idNumber || '',
      location: location || '',
      occupation: occupation || '',
      employment_status: employmentStatus || '',
      interests: Array.isArray(interests) ? interests : null,
      education_level: educationLevel || '',
      additional_notes: additionalNotes || '',
      is_student: typeof isStudent === 'boolean' ? isStudent : false,
    };

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: emailRedirectUrl,
        data: userData,
      },
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      return new Response(JSON.stringify({ success: false, error: 'Unable to generate invite link' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const emailContent = buildInviteEmail({ actionLink, email, fullName, resend });
    const replyToEmail = Deno.env.get('BREVO_REPLY_TO_EMAIL')?.trim();
    const replyToName = Deno.env.get('BREVO_REPLY_TO_NAME')?.trim();
    const brevoData = await sendBrevoEmail({
      sender: {
        email: Deno.env.get('BREVO_SENDER_EMAIL')?.trim() || 'support@turuturustars.co.ke',
        name: Deno.env.get('BREVO_SENDER_NAME')?.trim() || 'Turuturu Stars',
      },
      to: [{ email, name: fullName || undefined }],
      subject: emailContent.subject,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
      replyTo: replyToEmail ? { email: replyToEmail, name: replyToName || undefined } : undefined,
      tags: ['turuturu-stars', resend ? 'invite-resend' : 'invite'],
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: resend
          ? 'Invitation email resent. Please check the inbox.'
          : 'Invitation email sent. Please check the inbox.',
        userId: data?.user?.id || null,
        email,
        brevoMessageId: brevoData.messageId || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
