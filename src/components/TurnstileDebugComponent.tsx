import { useRef, useEffect, useState } from 'react';
import { useTurnstileDebug } from '@/hooks/useTurnstileDebug';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Trash2 } from 'lucide-react';

/**
 * TurnstileDebugComponent - Debug-friendly Turnstile widget tester
 * 
 * Usage in your auth flow:
 * ```tsx
 * <TurnstileDebugComponent />
 * ```
 * 
 * Check browser console for detailed logs
 */
export const TurnstileDebugComponent = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { token, error, isLoading, renderCaptcha, reset, remove, getToken, isExpired } = useTurnstileDebug();
  const [copyStatus, setCopyStatus] = useState(false);

  // Render widget on mount
  useEffect(() => {
    if (containerRef.current) {
      renderCaptcha(containerRef.current).catch(err => {
        console.error('Failed to render:', err);
      });
    }

    return () => {
      remove();
    };
  }, [renderCaptcha, remove]);

  const handleCopyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    }
  };

  const handleCheckExpiry = () => {
    const expired = isExpired();
    console.log(`[Debug] Token expired: ${expired}`);
    alert(`Token expired: ${expired}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Turnstile Debug Component
          </CardTitle>
          <CardDescription>
            Testing Cloudflare Turnstile visibility and functionality. Check browser console for logs.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Widget Container */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Widget Container</h3>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-background/50 flex items-center justify-center min-h-[100px]">
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading Turnstile...
                </div>
              )}
              {!isLoading && (
                <div ref={containerRef} id="turnstile-debug-container" />
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-2 gap-4">
            {/* Loading Status */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Loading Status</p>
              <Badge variant={isLoading ? 'default' : 'secondary'} className="w-full justify-center">
                {isLoading ? 'Loading...' : 'Ready'}
              </Badge>
            </div>

            {/* Token Status */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Token Status</p>
              <Badge
                variant={token ? 'default' : 'outline'}
                className={`w-full justify-center ${token ? 'bg-green-600' : ''}`}
              >
                {token ? '✓ Received' : '○ Waiting'}
              </Badge>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          {/* Token Display */}
          {token && (
            <div className="space-y-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-sm text-green-900 dark:text-green-400">Token Received</p>
              </div>
              <div className="bg-background/50 rounded p-2 font-mono text-xs break-all max-h-20 overflow-y-auto">
                {token.substring(0, 50)}...
              </div>
              <p className="text-xs text-muted-foreground">
                Length: {token.length} characters
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopyToken}
              disabled={!token}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {copyStatus ? '✓ Copied' : 'Copy Token'}
            </Button>

            <Button
              onClick={handleCheckExpiry}
              disabled={!token}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Check Expiry
            </Button>

            <Button
              onClick={() => reset()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Widget
            </Button>

            <Button
              onClick={() => remove()}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Widget
            </Button>
          </div>

          {/* Debug Info */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="font-semibold text-sm">Debug Info</p>
            <div className="space-y-1 text-xs text-muted-foreground font-mono">
              <p>• Site Key: {import.meta.env.VITE_TURNSTILE_SITE_KEY ? '✓ Set' : '✗ Missing'}</p>
              <p>• Script Loaded: {true ? '✓ Yes' : '✗ No'}</p>
              <p>• Widget Status: {token ? 'Ready' : 'Waiting'}</p>
              <p>• Open console (F12) for detailed logs</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="font-semibold text-sm">How to Use:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Complete the CAPTCHA checkbox above</li>
              <li>Token will appear automatically</li>
              <li>Click "Copy Token" to copy for testing</li>
              <li>Check browser console (F12) for debug logs</li>
              <li>Use "Reset Widget" if needed</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TurnstileDebugComponent;
