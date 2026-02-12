import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface VerificationRequest {
  token?: string;
}

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  action?: string;
  cdata?: string;
}

const DEFAULT_ALLOWED_ORIGIN = 'https://turuturustars.co.ke';

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

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed. Use POST.' }, 405, origin);
  }

  let body: VerificationRequest;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400, origin);
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return json({ success: false, error: 'Missing Turnstile token.' }, 400, origin);
  }

  const secretKey =
    Deno.env.get('TURNSTILE_SECRET_KEY') ??
    Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY') ??
    Deno.env.get('CAPTCHA_SECRET');

  if (!secretKey) {
    return json(
      {
        success: false,
        error: 'Turnstile secret key is not configured for verify-turnstile edge function.',
      },
      503,
      origin
    );
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const payload = new URLSearchParams();
    payload.set('secret', secretKey);
    payload.set('response', token);
    if (clientIp) payload.set('remoteip', clientIp);

    const providerResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      }
    );

    const raw = await providerResponse.text();
    let parsed: TurnstileResponse;

    try {
      parsed = JSON.parse(raw) as TurnstileResponse;
    } catch {
      return json(
        {
          success: false,
          error: 'Invalid response from Turnstile provider.',
          providerStatus: providerResponse.status,
        },
        502,
        origin
      );
    }

    return json(
      {
        success: parsed.success,
        data: parsed,
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Turnstile verification error', error);
    return json(
      {
        success: false,
        error: 'Verification request failed. Try again.',
      },
      502,
      origin
    );
  }
});
