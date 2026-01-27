import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface VerificationRequest {
  token: string;
}

interface CloudflareResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  score?: number;
  score_reason?: string[];
}

interface ResponseBody {
  success: boolean;
  data?: CloudflareResponse;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // CORS headers for localhost development and production
  const origin = req.headers.get('origin') || '';
  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') ||
      origin.includes('turuturustars.co.ke')
        ? origin
        : 'https://turuturustars.co.ke',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST.',
      }),
      {
        status: 405,
        headers: corsHeaders,
      }
    );
  }

  try {
    // Parse request body
    let body: VerificationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body.',
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Validate token is present
    const { token } = body;
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing or invalid token in request body.',
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Get secret key from environment
    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY environment variable not set');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error. Please try again later.',
        }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // Call Cloudflare verification API
    const cloudflareResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    // Check if Cloudflare API call was successful
    if (!cloudflareResponse.ok) {
      console.error(
        `Cloudflare API error: ${cloudflareResponse.status} ${cloudflareResponse.statusText}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to verify token with Cloudflare.',
        }),
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    // Parse Cloudflare response
    const cloudflareData: CloudflareResponse =
      await cloudflareResponse.json();

    // Return Cloudflare response
    const responseBody: ResponseBody = {
      success: cloudflareData.success,
      data: cloudflareData,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred.',
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
