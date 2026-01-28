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

/*
Original Turnstile verification implementation (commented out for now).
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
    // Log the incoming request
    console.log('Request received:', req);

    // Parse request body
    let body: VerificationRequest;
    try {
      const rawBody = await req.text();
      console.log('Raw Request Body:', rawBody);
      body = JSON.parse(rawBody);
    } catch (err) {
      console.error('Error parsing JSON:', err);
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
      console.error('Missing or invalid token:', token);
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
    console.log('TURNSTILE_SECRET_KEY:', secretKey ? 'Loaded' : 'Not Loaded');
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

    // Log Cloudflare response
    const cloudflareRawResponse = await cloudflareResponse.text();
    console.log('Cloudflare Raw Response:', cloudflareRawResponse);

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
    const cloudflareData: CloudflareResponse = JSON.parse(cloudflareRawResponse);

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
*/

// Temporary stubbed handler: Turnstile verification is commented out above.
// Returns OK so clients don't receive 401/500 while captcha is disabled.
serve(() => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://turuturustars.co.ke',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  return new Response(JSON.stringify({ success: true, data: { success: true } }), {
    status: 200,
    headers,
  });
});
