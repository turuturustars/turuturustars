const ANON_KEY = 'sb_publishable_MDs8dxvnfc6wGUXUHzB1iA_WLFwJO6T';

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    /* ---------- CORS ---------- */
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Access-Control-Allow-Headers': 'content-type,x-client-info,apikey',
        },
      });
    }

    /* ---------- ROUTE GUARD ---------- */
    if (req.method !== 'POST' || !url.pathname.startsWith('/pesapal')) {
      return new Response('Not found', { status: 404 });
    }

    /* ---------- TARGET ---------- */
    // Always forward to the IPN handler in Supabase
    const target =
      `https://mkcgkfzltohxagqvsbqk.functions.supabase.co/pesapal-ipn` +
      `${url.search}`;

    /* ---------- HEADERS ---------- */
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('apikey', ANON_KEY);
    headers.set('x-client-info', 'pesapal-ipn-proxy');

    // ❌ DO NOT forward Authorization for IPN
    // Supabase Edge Function has verifyJWT: false

    /* ---------- PROXY ---------- */
    const resp = await fetch(target, {
      method: 'POST',
      headers,
      body: req.body, // stream body untouched
    });

    /* ---------- RESPONSE ---------- */
    const respHeaders = new Headers(resp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Expose-Headers', '*');

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  },
};
