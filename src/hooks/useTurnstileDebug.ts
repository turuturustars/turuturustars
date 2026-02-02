/**
 * useTurnstileDebug - Placeholder hook for Cloudflare Turnstile (disabled)
 * Returns safe placeholder values so components importing this hook continue to work.
 */
export const useTurnstileDebug = () => {
  const token = null as string | null;
  const isLoading = false;
  const error = null as string | null;
  const renderCaptcha = async (_container?: HTMLDivElement) => {
    // no-op placeholder
  };
  const reset = () => {};
  const remove = () => {};
  const getToken = () => null as string | null;
  const isExpired = () => false;
  const containerRef = { current: null } as { current: HTMLDivElement | null };

  return {
    token,
    isLoading,
    error,
    renderCaptcha,
    reset,
    remove,
    getToken,
    isExpired,
    containerRef,
  };
};
