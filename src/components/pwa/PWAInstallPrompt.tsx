import { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { MonitorSmartphone, RefreshCw, WifiOff, X } from "lucide-react";

const INSTALL_DISMISS_KEY = "pwa_install_prompt_dismissed_at";
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 3;
const INSTALL_PROMPT_VISIBLE_MS = 5000;

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const PWAInstallPrompt = () => {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneMode());
  const [isDismissed, setIsDismissed] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("PWA service worker registration failed:", error);
    },
  });

  useEffect(() => {
    try {
      const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || "0");
      const hidden = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION_MS;
      setIsDismissed(hidden);
    } catch {
      setIsDismissed(false);
    }
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Let the browser show its native install banner/icon. The custom toast
      // below stays as a gentle fallback without blocking the page.
      if (event.defaultPrevented) return;
    };

    const onInstalled = () => {
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const deviceFlags = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isDesktop = !isIOS && !isAndroid;

    return { isIOS, isAndroid, isDesktop };
  }, []);

  const canShowManualInstall = !isInstalled && (deviceFlags.isIOS || deviceFlags.isAndroid || deviceFlags.isDesktop);

  const showInstallPrompt = !isInstalled && !isDismissed && canShowManualInstall;

  const dismissInstallPrompt = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures in private mode.
    }
  };

  useEffect(() => {
    if (!showInstallPrompt) return;

    const timeoutId = window.setTimeout(dismissInstallPrompt, INSTALL_PROMPT_VISIBLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [showInstallPrompt]);

  return (
    <>
      {offlineReady && (
        <div className="fixed left-4 right-4 top-4 z-[120] mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-lg">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-4 w-4 text-emerald-700" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900">Offline ready</p>
              <p className="text-xs text-emerald-800">You can open this app even with weak or no internet.</p>
            </div>
            <button
              type="button"
              className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
              onClick={() => setOfflineReady(false)}
              aria-label="Close offline ready notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {needRefresh && (
        <div className="fixed left-4 right-4 top-4 z-[130] mx-auto max-w-md rounded-xl border border-sky-200 bg-sky-50 p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sky-900">Update available</p>
              <p className="text-xs text-sky-800">Refresh once to use the latest version.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-8 px-3" onClick={() => updateServiceWorker(true)}>
                <RefreshCw className="h-4 w-4" />
                Update
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNeedRefresh(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {showInstallPrompt && (
        <div
          className="fixed bottom-3 right-3 z-[110] w-[min(18rem,calc(100vw-1.5rem))] animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-md border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur sm:bottom-4 sm:right-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-blue-50 p-1.5 text-blue-700">
              <MonitorSmartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">Install Turuturu Stars App</p>
              <p className="truncate text-[11px] text-slate-600">Quick app access from your home screen.</p>
            </div>
            <button
              type="button"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={dismissInstallPrompt}
              aria-label="Close install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
