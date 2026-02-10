export interface Env {
  SUPABASE_ANON_KEY: string;
  SUPABASE_FUNCTION_URL?: string;
}

const FALLBACK_FUNCTION_URL = 'https://mkcgkfzltohxagqvsbqk.functions.supabase.co/pesapal-ipn';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
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

    /* ---------- CONFIG ---------- */
    const anonKey = env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      return new Response('Missing SUPABASE_ANON_KEY', { status: 500 });
    }
    const targetBase = env.SUPABASE_FUNCTION_URL || FALLBACK_FUNCTION_URL;

    /* ---------- TARGET ---------- */
    const target = `${targetBase}${url.search}`;

    /* ---------- HEADERS ---------- */
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('apikey', anonKey);
    headers.set('x-client-info', 'pesapal-ipn-proxy');

    // Do not forward Authorization for IPN; function verify_jwt is false

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
