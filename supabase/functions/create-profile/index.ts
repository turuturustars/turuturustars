import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface CreateProfileRequest {
  email: string;
  profile: Record<string, unknown>;
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':
      origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('turuturustars.co.ke')
        ? origin
        : 'https://turuturustars.co.ke',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-create-profile-secret',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const secretHeader = req.headers.get('x-create-profile-secret') || '';
    const expectedSecret = Deno.env.get('CREATE_PROFILE_SECRET');
    if (!expectedSecret || secretHeader !== expectedSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const bodyText = await req.text();
    let body: CreateProfileRequest;
    try {
      body = JSON.parse(bodyText) as CreateProfileRequest;
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { email, profile } = body;
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Missing email' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Find auth user by email using admin endpoint
    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    });

    if (!usersRes.ok) {
      const text = await usersRes.text();
      console.error('Failed to query admin users:', usersRes.status, text);
      return new Response(JSON.stringify({ success: false, error: 'Failed to query auth users' }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const usersJson = await usersRes.json();
    const foundUser = Array.isArray(usersJson) && usersJson.length > 0 ? usersJson[0] : null;

    if (!foundUser || !foundUser.id) {
      return new Response(JSON.stringify({ success: false, error: 'Auth user not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const userId = foundUser.id as string;

    // Prepare profile payload and upsert via REST
    const payload = { id: userId, ...profile };

    const upsertUrl = `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`;
    const upsertRes = await fetch(upsertUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    const upsertText = await upsertRes.text();
    if (!upsertRes.ok) {
      console.error('Failed to upsert profile:', upsertRes.status, upsertText);
      return new Response(JSON.stringify({ success: false, error: 'Failed to upsert profile', details: upsertText }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, data: JSON.parse(upsertText) }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Unexpected error in create-profile function:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://turuturustars.co.ke' },
    });
  }
});
