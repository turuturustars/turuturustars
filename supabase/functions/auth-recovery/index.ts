import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPPORT_PHONE = '0700471113';
const DEFAULT_SITE_URL = 'https://turuturustars.co.ke';
const DEFAULT_ALLOWED_ORIGIN = 'https://turuturustars.co.ke';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const TURNSTILE_SECRET =
  Deno.env.get('TURNSTILE_SECRET_KEY') ||
  Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY') ||
  Deno.env.get('CAPTCHA_SECRET') ||
  '';

interface RecoveryRequest {
  identifier?: string;
  captchaToken?: string;
  redirectTo?: string;
}

type IdentifierKind = 'email' | 'membership_number';

type LookupResult = {
  kind: IdentifierKind;
  normalized: string;
};

type RecoveryResponse = {
  success: boolean;
  exists: boolean;
  resetSent: boolean;
  message: string;
  emailHint: string | null;
  supportPhone: string;
  identifierType: IdentifierKind;
  error?: string;
};

const pickOrigin = (origin: string | null) => {
  if (!origin) return DEFAULT_ALLOWED_ORIGIN;

  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin === DEFAULT_ALLOWED_ORIGIN
  ) {
    return origin;
  }

  return DEFAULT_ALLOWED_ORIGIN;
};

const corsHeaders = (origin: string | null) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': pickOrigin(origin),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const json = (origin: string | null, body: RecoveryResponse, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });

const parseMembershipNumber = (value: string): string | null => {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!compact.startsWith('TS')) return null;

  const digits = compact.slice(2).replace(/\D/g, '');
  if (!digits) return null;

  const normalizedDigits = digits.length < 5 ? digits.padStart(5, '0') : digits;
  return `TS-${normalizedDigits}`;
};

const parseIdentifier = (rawIdentifier: string): LookupResult | null => {
  const trimmed = rawIdentifier.trim();
  if (!trimmed) return null;

  const maybeMembership = parseMembershipNumber(trimmed);
  if (maybeMembership) {
    return { kind: 'membership_number', normalized: maybeMembership };
  }

  const normalizedEmail = trimmed.toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return null;
  }

  return { kind: 'email', normalized: normalizedEmail };
};

const maskEmail = (email: string): string => {
  const [localPart, domainPart] = email.split('@');
  if (!localPart || !domainPart) return email;

  const domainSegments = domainPart.split('.');
  const domainRoot = domainSegments[0] || '';
  const topLevelDomain = domainSegments.slice(1).join('.');

  const localMask =
    localPart.length <= 2
      ? `${localPart.slice(0, 1)}*`
      : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 2))}`;
  const domainMask =
    domainRoot.length <= 2
      ? `${domainRoot.slice(0, 1)}*`
      : `${domainRoot.slice(0, 2)}${'*'.repeat(Math.max(domainRoot.length - 2, 2))}`;

  return `${localMask}@${domainMask}${topLevelDomain ? `.${topLevelDomain}` : ''}`;
};

const verifyTurnstileToken = async (token: string, req: Request): Promise<boolean> => {
  if (!TURNSTILE_SECRET) {
    throw new Error('Turnstile secret is missing in edge function secrets.');
  }

  const payload = new URLSearchParams();
  payload.set('secret', TURNSTILE_SECRET);
  payload.set('response', token);

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (clientIp) {
    payload.set('remoteip', clientIp);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare verification request failed (${response.status}).`);
  }

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
};

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json(
      origin,
      {
        success: false,
        exists: false,
        resetSent: false,
        message: 'Method not allowed. Use POST.',
        emailHint: null,
        supportPhone: SUPPORT_PHONE,
        identifierType: 'email',
        error: 'Method not allowed',
      },
      405
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(origin, {
      success: false,
      exists: false,
      resetSent: false,
      message: 'Auth recovery service is not configured correctly.',
      emailHint: null,
      supportPhone: SUPPORT_PHONE,
      identifierType: 'email',
      error: 'Missing Supabase service configuration.',
    });
  }

  let body: RecoveryRequest;
  try {
    body = await req.json();
  } catch {
    return json(
      origin,
      {
        success: false,
        exists: false,
        resetSent: false,
        message: 'Invalid JSON body.',
        emailHint: null,
        supportPhone: SUPPORT_PHONE,
        identifierType: 'email',
        error: 'Invalid JSON body.',
      },
      400
    );
  }

  const identifier = typeof body.identifier === 'string' ? body.identifier : '';
  const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken.trim() : '';
  const lookup = parseIdentifier(identifier);

  if (!lookup) {
    return json(origin, {
      success: false,
      exists: false,
      resetSent: false,
      message: 'Use a valid email address or TS membership number (example: TS-00001).',
      emailHint: null,
      supportPhone: SUPPORT_PHONE,
      identifierType: 'email',
      error: 'Invalid identifier format.',
    });
  }

  if (!captchaToken) {
    return json(origin, {
      success: false,
      exists: false,
      resetSent: false,
      message: 'Complete Cloudflare verification first.',
      emailHint: null,
      supportPhone: SUPPORT_PHONE,
      identifierType: lookup.kind,
      error: 'Missing captcha token.',
    });
  }

  try {
    const verified = await verifyTurnstileToken(captchaToken, req);
    if (!verified) {
      return json(origin, {
        success: false,
        exists: false,
        resetSent: false,
        message: 'Cloudflare verification failed. Retry and submit again.',
        emailHint: null,
        supportPhone: SUPPORT_PHONE,
        identifierType: lookup.kind,
        error: 'Captcha verification failed.',
      });
    }
  } catch (verificationError) {
    return json(origin, {
      success: false,
      exists: false,
      resetSent: false,
      message: 'Could not verify Cloudflare challenge. Please try again.',
      emailHint: null,
      supportPhone: SUPPORT_PHONE,
      identifierType: lookup.kind,
      error:
        verificationError instanceof Error
          ? verificationError.message
          : 'Cloudflare verification failed.',
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const query = supabaseAdmin
    .from('profiles')
    .select('id, email, membership_number')
    .limit(1);

  const { data: profile, error: profileError } =
    lookup.kind === 'membership_number'
      ? await query.eq('membership_number', lookup.normalized).maybeSingle()
      : await query.eq('email', lookup.normalized).maybeSingle();

  if (profileError) {
    return json(origin, {
      success: false,
      exists: false,
      resetSent: false,
      message: 'Unable to verify your account right now. Please try again shortly.',
      emailHint: null,
      supportPhone: SUPPORT_PHONE,
      identifierType: lookup.kind,
      error: profileError.message,
    });
  }

  if (!profile) {
    return json(origin, {
      success: true,
      exists: false,
      resetSent: false,
      message: 'No registered member was found with those credentials.',
      emailHint: null,
      supportPhone: SUPPORT_PHONE,
      identifierType: lookup.kind,
    });
  }

  const profileEmail = typeof profile.email === 'string' ? profile.email.trim() : '';
  if (!profileEmail) {
    return json(origin, {
      success: true,
      exists: true,
      resetSent: false,
      message: 'Account found, but no email is linked for reset. Please contact support.',
      emailHint: null,
      supportPhone: SUPPORT_PHONE,
      identifierType: lookup.kind,
    });
  }

  const targetRedirect = (() => {
    const rawRedirect = typeof body.redirectTo === 'string' ? body.redirectTo.trim() : '';
    if (!rawRedirect) return `${DEFAULT_SITE_URL}/auth/reset-password`;
    return rawRedirect;
  })();

  const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(profileEmail, {
    redirectTo: targetRedirect,
  });

  if (resetError) {
    return json(origin, {
      success: false,
      exists: true,
      resetSent: false,
      message: 'Account found, but we could not send a reset link right now.',
      emailHint: maskEmail(profileEmail),
      supportPhone: SUPPORT_PHONE,
      identifierType: lookup.kind,
      error: resetError.message,
    });
  }

  return json(origin, {
    success: true,
    exists: true,
    resetSent: true,
    message: 'Account found. A password reset link has been sent to your email.',
    emailHint: maskEmail(profileEmail),
    supportPhone: SUPPORT_PHONE,
    identifierType: lookup.kind,
  });
});
