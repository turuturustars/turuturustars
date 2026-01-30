// Helper to call a backend endpoint that triggers server-side profile creation.
// Configure the endpoint via Vite env: VITE_CREATE_PROFILE_ENDPOINT
export async function completeProfileViaBackend(email: string, profile?: Record<string, unknown>, requestId?: string) {
  const endpoint = import.meta.env.VITE_CREATE_PROFILE_ENDPOINT;
  if (!endpoint) return null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requestId) headers['x-request-id'] = requestId;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, profile }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(`completeProfile failed: ${res.status} ${text}`);
  }

  return res.json();
}
