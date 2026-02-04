// Helper to call a backend endpoint that triggers server-side profile creation.
// Configure the endpoint via Vite env: VITE_CREATE_PROFILE_ENDPOINT
// In development, gracefully handles missing endpoints
export async function completeProfileViaBackend(email: string, profile?: Record<string, unknown>, requestId?: string) {
  // Default to proxy path when VITE_CREATE_PROFILE_ENDPOINT is not provided
  const endpoint = import.meta.env.VITE_CREATE_PROFILE_ENDPOINT || '/api/create-profile-proxy';
  if (!endpoint) return null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requestId) headers['x-request-id'] = requestId;
  const proxySecret = import.meta.env.VITE_CREATE_PROFILE_PROXY_SECRET;
  if (proxySecret) {
    headers['x-proxy-secret'] = proxySecret;
  } else if (endpoint.includes('/api/create-profile-proxy')) {
    // Avoid calling a secured proxy without credentials
    return null;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, profile }),
    });

    if (!res.ok) {
      // In development, 404 on /api/create-profile-proxy is expected
      // The profile will be created by database trigger instead
      if (res.status === 404 && import.meta.env.DEV) {
        console.debug(`Profile creation endpoint not available in development (${res.status}). Will use database trigger instead.`);
        return null;
      }
      
      const text = await res.text().catch(() => String(res.status));
      throw new Error(`completeProfile failed: ${res.status} ${text}`);
    }

    return res.json();
  } catch (error) {
    // Network errors in development are expected if Vercel function not deployed
    if (import.meta.env.DEV && error instanceof TypeError) {
      console.debug('Profile creation endpoint unavailable (network error). Database trigger will handle profile creation.', error);
      return null;
    }
    throw error;
  }
}
