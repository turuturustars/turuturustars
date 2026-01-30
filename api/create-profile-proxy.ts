// Vercel Serverless Function example: api/create-profile-proxy.ts
// Secure proxy that calls the Supabase Edge Function `create-profile`.
// Usage: POST /api/create-profile-proxy with JSON { email }
// Headers: `x-proxy-secret: <CREATE_PROFILE_PROXY_SECRET>` — this is your site-server secret

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const proxySecret = req.headers['x-proxy-secret'] || req.headers['x-create-profile-proxy-secret'];
  if (!proxySecret || proxySecret !== process.env.CREATE_PROFILE_PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const bodyPayload = req.body || {};
  const { email } = bodyPayload;
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Missing email' });

  const functionUrl = process.env.SUPABASE_CREATE_PROFILE_URL;
  const functionSecret = process.env.CREATE_PROFILE_SECRET;
  if (!functionUrl || !functionSecret) return res.status(500).json({ error: 'Server misconfigured' });

  try {
    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-create-profile-secret': functionSecret,
      },
      body: JSON.stringify(bodyPayload),
    });

    const body = await resp.text();
    if (!resp.ok) return res.status(resp.status).send(body);
    return res.status(200).send(body);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return res.status(502).json({ error: 'Bad gateway', detail: String(err) });
  }
}
