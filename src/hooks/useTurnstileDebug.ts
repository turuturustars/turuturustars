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
  appearance?: 'always' | 'execute' | 'interaction-only' | 'managed';
  tabindex?: number;
  'response-field'?: string;
  'response-field-name'?: string;
  'retry'?: 'auto' | 'manual' | 'never';
  'retry-interval'?: number;
  'auto-reset-on-expire'?: boolean;
}

/**
 * useTurnstileDebug - Debug-friendly React hook for Cloudflare Turnstile
 * 
 * Enhanced with:
 * - Explicit script loading with detailed logging
 * - Direct window.turnstile.render() calls
 * - useRef for container management
 * - Console logging for all widget lifecycle events
 * - Debug-safe production code
 * - Visible checkbox mode by default
 * 
 * Usage in component:
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { token, error, isLoading, renderCaptcha, reset } = useTurnstileDebug();
 * 
 * useEffect(() => {
 *   if (containerRef.current) {
 *     renderCaptcha(containerRef.current);
 *   }
 * }, []);
 * 
 * return <div ref={containerRef} id="turnstile-container" />;
 * ```
 */
export const useTurnstileDebug = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isScriptLoadedRef = useRef(false);
  const isScriptLoadingRef = useRef(false);

  const DEBUG = true; // Set to false in production if needed

  const log = (...args: unknown[]) => {
    if (DEBUG) {
      console.log('[Turnstile Debug]', ...args);
    }
  };

  const logError = (...args: unknown[]) => {
    console.error('[Turnstile Debug]', ...args);
  };

  /**
   * Load Turnstile script once from CDN
   */
  const loadTurnstileScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Already loaded
      if (isScriptLoadedRef.current) {
        log('Script already loaded');
        resolve();
        return;
      }

      // Currently loading
      if (isScriptLoadingRef.current) {
        log('Script loading in progress, waiting...');
        const checkInterval = setInterval(() => {
          if (isScriptLoadedRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      isScriptLoadingRef.current = true;
      log('Starting script load from CDN');

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        log('Script loaded from CDN');
        
        // Wait for turnstile to be available
        let attempts = 0;
        const checkTurnstile = setInterval(() => {
          const turnstileWindow = window as TurnstileWindow;
          
          if (turnstileWindow.turnstile) {
            log('window.turnstile is available');
            clearInterval(checkTurnstile);
            isScriptLoadedRef.current = true;
            isScriptLoadingRef.current = false;
            resolve();
          } else if (attempts >= 50) {
            clearInterval(checkTurnstile);
            logError('window.turnstile not available after script load');
            isScriptLoadingRef.current = false;
            reject(new Error('Turnstile API not available after script load'));
          }
          
          attempts++;
        }, 100);
      };

      script.onerror = () => {
        logError('Failed to load Turnstile script from CDN');
        isScriptLoadingRef.current = false;
        reject(new Error('Failed to load Turnstile script'));
      };

      document.head.appendChild(script);
      log('Script tag appended to head');
    });
  }, []);

  /**
   * Render widget explicitly using window.turnstile.render
   */
  const renderCaptcha = useCallback(
    async (container: HTMLDivElement): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
        log('Site key configured:', !!siteKey);

        if (!siteKey) {
          const msg = 'Turnstile site key not configured. Set VITE_TURNSTILE_SITE_KEY.';
          setError(msg);
          logError(msg);
          throw new Error(msg);
        }

        // Store container ref
        containerRef.current = container;
        log('Container ref set:', container.id);

        // Ensure script is loaded
        log('Ensuring script is loaded...');
        await loadTurnstileScript();
        log('Script load confirmed');

        const turnstileWindow = window as TurnstileWindow;

        if (!turnstileWindow.turnstile) {
          const msg = 'window.turnstile is not available';
          setError(msg);
          logError(msg);
          throw new Error(msg);
        }

        log('Calling window.turnstile.render()');

        // Explicitly call window.turnstile.render
        const widgetId = turnstileWindow.turnstile.render(container, {
          sitekey: siteKey,
          theme: 'light',
          size: 'normal',
          appearance: 'always', // Always visible (not invisible or execute-only)
          callback: (captchaToken: string) => {
            log('Callback fired with token:', captchaToken.substring(0, 20) + '...');
            setToken(captchaToken);
          },
          'error-callback': () => {
            logError('Captcha error callback fired');
            setError('CAPTCHA error. Please try again.');
          },
          'expired-callback': () => {
            log('Captcha expired callback fired');
            setToken(null);
            setError('CAPTCHA expired. Please verify again.');
          },
          'timeout-callback': () => {
            log('Captcha timeout callback fired');
            setToken(null);
            setError('CAPTCHA timeout. Please try again.');
          },
          'before-interactive-callback': () => {
            log('Before interactive callback fired');
          },
          'after-interactive-callback': () => {
            log('After interactive callback fired');
          },
          'unsupported-callback': () => {
            logError('Unsupported environment callback fired');
            setError('CAPTCHA not supported in your environment.');
          },
        });

        widgetIdRef.current = widgetId;
        log('Widget rendered with ID:', widgetId);

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render CAPTCHA';
        setError(errorMessage);
        setIsLoading(false);
        logError('Render error:', errorMessage);
        throw err;
      }
    },
    [loadTurnstileScript]
  );

  /**
   * Reset widget
   */
  const reset = useCallback((): void => {
    try {
      if (!widgetIdRef.current) {
        log('No widget to reset');
        return;
      }

      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        log('Resetting widget:', widgetIdRef.current);
        turnstileWindow.turnstile.reset(widgetIdRef.current);
        setToken(null);
        setError(null);
        log('Widget reset complete');
      }
    } catch (err) {
      logError('Failed to reset widget:', err);
      setError('Failed to reset CAPTCHA');
    }
  }, []);

  /**
   * Remove widget from DOM
   */
  const remove = useCallback((): void => {
    try {
      if (!widgetIdRef.current) return;

      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        log('Removing widget:', widgetIdRef.current);
        turnstileWindow.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
        containerRef.current = null;
        setToken(null);
        setError(null);
        log('Widget removed');
      }
    } catch (err) {
      logError('Failed to remove widget:', err);
    }
  }, []);

  /**
   * Get current token
   */
  const getToken = useCallback((): string | null => {
    if (!widgetIdRef.current) {
      log('No widget ID, cannot get token');
      return null;
    }

    try {
      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        const response = turnstileWindow.turnstile.getResponse(widgetIdRef.current);
        log('Token retrieved:', response ? 'present' : 'empty');
        return response || null;
      }
    } catch (err) {
      logError('Failed to get token:', err);
    }
    return null;
  }, []);

  /**
   * Check if token expired
   */
  const isExpired = useCallback((): boolean => {
    if (!widgetIdRef.current) {
      log('No widget ID, cannot check expiration');
      return false;
    }

    try {
      const turnstileWindow = window as TurnstileWindow;
      if (turnstileWindow.turnstile && widgetIdRef.current) {
        const expired = turnstileWindow.turnstile.isExpired(widgetIdRef.current);
        log('Token expired check:', expired);
        return expired;
      }
    } catch (err) {
      logError('Failed to check expiration:', err);
    }
    return false;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    log('Hook mounted');
    return () => {
      log('Hook unmounting, removing widget');
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
    containerRef, // Expose ref for direct use
  };
};
