/**
 * useTurnstile - React hook for Cloudflare Turnstile CAPTCHA
 * 
 * This hook is currently disabled and provides no-op placeholders.
 * When re-enabled, it will support lazy loading of the Turnstile script,
 * widget lifecycle management, and token validation.
 */

interface TurnstileOptions {
  sitekey?: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
}

export const useTurnstile = () => {
  // Turnstile integration is currently disabled.
  // Provide safe no-op placeholders so existing components don't break.

  const token = null as string | null;
  const isLoading = false;
  const error = null as string | null;

  const renderCaptcha = async (_containerId?: string, _options?: Partial<TurnstileOptions>) => {
    // no-op placeholder
  };

  const reset = () => {
    // no-op placeholder
  };

  const remove = () => {
    // no-op placeholder
  };

  const getToken = () => null as string | null;

  const isExpired = () => false;

  return {
    token,
    isLoading,
    error,
    renderCaptcha,
    reset,
    remove,
    getToken,
    isExpired,
  };
};
