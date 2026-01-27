import { useCallback, useState, useRef } from 'react';

declare global {
  interface Window {
    turnstile: any;
  }
}

interface TurnstileOptions {
  sitekey: string;
  theme: 'light' | 'dark';
  size?: 'normal' | 'compact';
  tabindex?: number;
  responseFieldName?: string;
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
  'timeout-callback'?: () => void;
  'before-interactive-callback'?: () => void;
  'after-interactive-callback'?: () => void;
  'unsupported-callback'?: () => void;
}

export const useCaptcha = () => {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderCaptcha = useCallback((containerId: string) => {
    setError(null);

    // Check if element exists
    const element = document.getElementById(containerId);
    if (!element) {
      setError('Captcha container not found');
      return;
    }

    // Don't render if already rendered
    if (widgetIdRef.current !== null) {
      return;
    }

    // Wait for turnstile to be available
    const maxAttempts = 20;
    let attempts = 0;

    const tryRender = () => {
      attempts++;

      if (!window.turnstile) {
        if (attempts < maxAttempts) {
          setTimeout(tryRender, 100);
        } else {
          setError('Turnstile failed to load');
        }
        return;
      }

      try {
        const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;

        if (!siteKey) {
          setError('Cloudflare site key not configured');
          return;
        }

        console.log('🔐 Rendering Turnstile with site key:', siteKey.substring(0, 10) + '...');

        const options: TurnstileOptions = {
          sitekey: siteKey,
          theme: 'light',
          size: 'normal',
          callback: (token: string) => {
            console.log('✅ Captcha token received');
            setCaptchaToken(token);
            setError(null);
          },
          'error-callback': () => {
            console.error('❌ Captcha error - Check your site key and domain configuration');
            setError('Captcha verification failed. Please try again.');
            setCaptchaToken(null);
          },
          'expired-callback': () => {
            console.warn('⏱️ Captcha expired');
            setError('Captcha expired. Please try again.');
            setCaptchaToken(null);
          },
          'timeout-callback': () => {
            console.warn('⏱️ Captcha timeout');
            setError('Captcha timeout. Please try again.');
            setCaptchaToken(null);
          },
          'unsupported-callback': () => {
            console.warn('⚠️ Turnstile not supported in this browser');
            setError('Captcha not supported in your browser');
          },
        };

        // Pass the actual HTMLElement
        const widgetId = window.turnstile.render(element, options);
        widgetIdRef.current = widgetId;
        console.log('✅ Captcha rendered successfully');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error rendering captcha:', err);
        setError(`Failed to render captcha: ${errorMsg}`);
      }
    };

    tryRender();
  }, []);

  const resetCaptcha = useCallback((containerId: string) => {
    if (!window.turnstile || widgetIdRef.current === null) return;

    try {
      const element = document.getElementById(containerId);
      if (element) {
        window.turnstile.reset(element);
      }
      setCaptchaToken(null);
      setError(null);
      console.log('🔄 Captcha reset');
    } catch (err) {
      console.error('Error resetting captcha:', err);
    }
  }, []);

  const removeCaptcha = useCallback((containerId: string) => {
    if (!window.turnstile || widgetIdRef.current === null) return;

    try {
      const element = document.getElementById(containerId);
      if (element) {
        window.turnstile.remove(element);
      }
      widgetIdRef.current = null;
      setCaptchaToken(null);
      setError(null);
      console.log('🗑️ Captcha removed');
    } catch (err) {
      // Silently ignore errors when removing
      console.debug('Captcha removal error (ignored):', err);
    }
  }, []);

  return {
    captchaToken,
    error,
    renderCaptcha,
    resetCaptcha,
    removeCaptcha,
  };
};
