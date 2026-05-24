export function generateRequestId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch (e) {
    // ignore
  }
  // fallback
  return `req_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}
