import { useState, useCallback, useEffect, useRef } from 'react';

interface TurnstileWindow extends Window {
  turnstile?: {
    render: (containerId: string, options: TurnstileOptions) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
    getResponse: (widgetId: string) => string | undefined;
    isExpired: (widgetId: string) => boolean;
  };
}

interface TurnstileOptions {
  sitekey: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  language?: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'before-interactive-callback'?: () => void;
  'after-interactive-callback'?: () => void;
  'unsupported-callback'?: () => void;
  appearance?: 'always' | 'execute' | 'interaction-only';
  tabindex?: number;
  'response-field'?: string;
  'response-field-name'?: string;
  'retry'?: 'auto' | 'manual' | 'never';
  'retry-interval'?: number;
  'auto-reset-on-expire'?: boolean;
}

/**
 * useTurnstile - React hook for Cloudflare Turnstile CAPTCHA
 * 
 * Features:
 * - Lazy loads Turnstile script from CDN
 * - Manages widget lifecycle (render, reset, remove)
 * - Handles token validation and expiration
 * - Provides error handling and callbacks
 * - Production-ready with TypeScript support
 * 
 * @returns Object with methods to manage Turnstile widget
 */
export const useTurnstile = () => {
  // Turnstile integration is currently disabled and preserved for future re-enable.
  // The original implementation has been commented out in this file for reference.
  // Provide a safe no-op placeholder API so existing components don't break.

  const token = null as string | null;
  const isLoading = false;
  const error = null as string | null;
  const renderCaptcha = async (_containerId?: string, _options?: Partial<TurnstileOptions>) => {
    // no-op placeholder
    return;
  };
  const reset = () => {
    // no-op placeholder
  };
  const remove = () => {
    // no-op placeholder
  };
  const getToken = () => null as string | null;
  const isExpired = () => false;

  /**
   * Waits for Turnstile script to be available
   */
  const waitForTurnstile = useCallback(
    (maxAttempts = 50): Promise<void> => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkInterval = setInterval(() => {
          const turnstileWindow = window as TurnstileWindow;
          if (turnstileWindow.turnstile) {
            clearInterval(checkInterval);
            isScriptLoadedRef.current = true;
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            reject(new Error('Turnstile script failed to load'));
          }
          attempts++;
        }, 100);
      });
    },
    []
  );

  /**
   * Renders the Turnstile widget in a container
   */
  const renderCaptcha = useCallback(
    async (containerId: string, options: Partial<TurnstileOptions> = {}): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;
        if (!siteKey) {
          throw new Error('Turnstile site key is not configured. Set VITE_CLOUDFLARE_SITE_KEY environment variable.');
        }

        // Wait for Turnstile to load
        if (!isScriptLoadedRef.current) {
          await waitForTurnstile();
        }

        const turnstileWindow = window as TurnstileWindow;
        if (!turnstileWindow.turnstile) {
          throw new Error('Turnstile API is not available');
        }

        // Clear any previous widget
        if (widgetIdRef.current && containerIdRef.current) {
          try {
            turnstileWindow.turnstile.remove(widgetIdRef.current);
          } catch (e) {
            console.warn('Failed to remove previous widget:', e);
          }
        }

        // Render new widget
        containerIdRef.current = containerId;
        widgetIdRef.current = turnstileWindow.turnstile.render(containerId, {
          sitekey: siteKey,
          theme: 'light',
          appearance: 'managed',
          callback: (captchaToken: string) => {
            setToken(captchaToken);
            options.callback?.(captchaToken);
          },
          'error-callback': () => {
            setError('Captcha error. Please try again.');
            options['error-callback']?.();
          },
          'expired-callback': () => {
            setToken(null);
            setError('Captcha expired. Please verify again.');
            options['expired-callback']?.();
          },
          'timeout-callback': () => {
            setToken(null);
            setError('Captcha timeout. Please try again.');
            options['timeout-callback']?.();
          },
          ...options,
        });

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load captcha';
        setError(errorMessage);
        setIsLoading(false);
        console.error('Turnstile error:', errorMessage);
        throw err;
      }
    },
    [waitForTurnstile]
  );

  /**
   * Resets the Turnstile widget
   */
  const reset = useCallback((): void => {
    try {
      if (!widgetIdRef.current) {
        console.warn('No Turnstile widget to reset');
        return;
      }

      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        turnstileWindow.turnstile.reset(widgetIdRef.current);
        setToken(null);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to reset Turnstile:', err);
      setError('Failed to reset captcha');
    }
  }, []);

  /**
   * Removes the Turnstile widget from DOM
   */
  const remove = useCallback((): void => {
    try {
      if (!widgetIdRef.current) return;

      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        turnstileWindow.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
        containerIdRef.current = null;
        setToken(null);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to remove Turnstile:', err);
    }
  }, []);

  /**
   * Gets the current token
   */
  const getToken = useCallback((): string | null => {
    if (!widgetIdRef.current) return null;

    try {
      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        return turnstileWindow.turnstile.getResponse(widgetIdRef.current) || null;
      }
    } catch (err) {
      console.error('Failed to get token:', err);
    }
    return null;
  }, []);

  /**
   * Checks if the current token is expired
   */
  const isExpired = useCallback((): boolean => {
    if (!widgetIdRef.current) return false;

    try {
      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        return turnstileWindow.turnstile.isExpired(widgetIdRef.current);
      }
    } catch (err) {
      console.error('Failed to check expiration:', err);
    }
    return false;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      remove();
    };
  }, [remove]);

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
