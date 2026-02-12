import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  callback?: (token: string) => void;
  'error-callback'?: (errorCode?: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  siteKey?: string;
  action?: string;
  className?: string;
  resetSignal?: number;
  onTokenChange: (token: string | null) => void;
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;

const ensureTurnstileScript = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile script.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

const TurnstileWidget = ({
  siteKey,
  action,
  className,
  resetSignal = 0,
  onTokenChange,
}: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const mountWidget = async () => {
      if (!siteKey) {
        setIsLoading(false);
        setError('Captcha site key is missing.');
        return;
      }

      setError(null);
      setIsLoading(true);
      onTokenChange(null);
      setIsVerified(false);

      try {
        await ensureTurnstileScript();

        if (!isMounted || !containerRef.current || !window.turnstile) {
          return;
        }

        containerRef.current.innerHTML = '';

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          size: 'flexible',
          callback: (token: string) => {
            onTokenChange(token);
            setError(null);
            setIsVerified(true);
          },
          'error-callback': () => {
            onTokenChange(null);
            setIsVerified(false);
            setError('Verification could not be completed. Please try again.');
          },
          'expired-callback': () => {
            onTokenChange(null);
            setIsVerified(false);
          },
          'timeout-callback': () => {
            onTokenChange(null);
            setIsVerified(false);
            setError('Verification timed out. Please try again.');
          },
        });

        setIsLoading(false);
      } catch (scriptError) {
        if (!isMounted) return;
        onTokenChange(null);
        setIsVerified(false);
        setError(scriptError instanceof Error ? scriptError.message : 'Failed to initialize captcha.');
        setIsLoading(false);
      }
    };

    mountWidget();

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [action, onTokenChange, siteKey]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenChange(null);
    setIsVerified(false);
    setError(null);
  }, [onTokenChange, resetSignal]);

  const status = useMemo(() => {
    if (isLoading) return 'Loading security check...';
    if (error) return error;
    if (isVerified) return 'Verified';
    return 'Complete the check to continue';
  }, [error, isLoading, isVerified]);

  if (!siteKey) {
    return (
      <div className={cn('rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-sm text-amber-900', className)}>
        Captcha is not configured. Set `VITE_CLOUDFLARE_SITE_KEY` (or `VITE_TURNSTILE_SITE_KEY`) in your environment.
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-background/70 p-3', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Human Verification
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            isVerified ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted text-muted-foreground'
          )}
        >
          {isVerified ? 'Verified' : 'Required'}
        </span>
      </div>

      <div ref={containerRef} className="min-h-[72px]" />

      <div className="mt-2 flex items-center gap-2 text-xs">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : error ? (
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        )}
        <span className={error ? 'text-destructive' : 'text-muted-foreground'}>{status}</span>
      </div>
    </div>
  );
};

export default TurnstileWidget;
