// Cloudflare Worker (module) - create-profile-proxy
// Verifies a proxy secret and forwards to Supabase Edge Function using function secret.
// Bind env vars in Cloudflare: SUPABASE_CREATE_PROFILE_URL, CREATE_PROFILE_SECRET, CREATE_PROFILE_PROXY_SECRET

export default {
  async fetch(request: Request, env: any) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const proxySecret = request.headers.get('x-proxy-secret') || request.headers.get('x-create-profile-proxy-secret');
    if (!proxySecret || proxySecret !== env.CREATE_PROFILE_PROXY_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const email = payload?.email;
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const functionUrl = env.SUPABASE_CREATE_PROFILE_URL;
    const functionSecret = env.CREATE_PROFILE_SECRET;
    if (!functionUrl || !functionSecret) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const resp = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-create-profile-secret': functionSecret,
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      const contentType = resp.headers.get('Content-Type') || 'text/plain';
      return new Response(text, { status: resp.status, headers: { 'Content-Type': contentType } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Proxy request failed', detail: String(err) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
  }
};
