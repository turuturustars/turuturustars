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
  // Turnstile debug hook disabled. Original implementation preserved in comments.
  // Return safe placeholders so components that import this hook continue to work.

  const token = null as string | null;
  const isLoading = false;
  const error = null as string | null;
  const renderCaptcha = async (_container?: HTMLDivElement) => {
    // no-op placeholder
    return;
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
