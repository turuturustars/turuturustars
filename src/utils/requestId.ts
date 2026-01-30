export function generateRequestId(): string {
  try {
    // modern browsers and node 18+ support crypto.randomUUID
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch (e) {
    // ignore
  }
  // fallback
  return `req_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}
