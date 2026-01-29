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
  // Captcha integration is currently disabled. Provide safe placeholders.
  const captchaToken = null as string | null;
  const error = null as string | null;

  const renderCaptcha = (containerId?: string) => {
    // no-op placeholder
  };

  const resetCaptcha = (containerId?: string) => {
    // no-op placeholder
  };

  const removeCaptcha = (containerId?: string) => {
    // no-op placeholder
  };

  return {
    captchaToken,
    error,
    renderCaptcha,
    resetCaptcha,
    removeCaptcha,
  };
};
