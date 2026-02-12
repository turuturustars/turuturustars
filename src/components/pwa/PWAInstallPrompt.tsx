import { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { Download, MonitorSmartphone, Pin, RefreshCw, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_DISMISS_KEY = "pwa_install_prompt_dismissed_at";
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 3;

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallInfo, setShowInstallInfo] = useState(false);
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
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallInfo(false);
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
    const isWindows = /windows/.test(ua);
    const isDesktop = !isIOS && !isAndroid;

    return { isIOS, isAndroid, isWindows, isDesktop };
  }, []);

  const supportsNativePrompt = !!deferredPrompt;
  const canShowManualInstall = !isInstalled && (deviceFlags.isIOS || deviceFlags.isAndroid || deviceFlags.isDesktop);

  const showInstallPrompt = !isInstalled && !isDismissed && (supportsNativePrompt || canShowManualInstall);

  const dismissInstallPrompt = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures in private mode.
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowInstallInfo(false);
      }

      setDeferredPrompt(null);
      return;
    }

    setShowInstallInfo((open) => !open);
  };

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
        <div className="fixed inset-x-4 bottom-4 z-[110] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Install Turuturu Stars App</p>
              <p className="text-xs text-slate-600">
                Faster launch, full-screen app, and home screen or taskbar access across Android, iPhone, and desktop.
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismissInstallPrompt}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="h-9" onClick={handleInstall}>
              <Download className="h-4 w-4" />
              {supportsNativePrompt ? "Install now" : "Show install steps"}
            </Button>
            {deviceFlags.isWindows && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                <Pin className="h-3.5 w-3.5" />
                Pin to taskbar supported
              </span>
            )}
          </div>

          {showInstallInfo && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {deviceFlags.isIOS && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Tap browser Share menu.</li>
                  <li>Select Add to Home Screen.</li>
                  <li>Tap Add to install the app icon.</li>
                </ol>
              )}

              {deviceFlags.isAndroid && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open browser menu.</li>
                  <li>Select Install app or Add to Home screen.</li>
                  <li>Confirm install to place the app icon.</li>
                </ol>
              )}

              {deviceFlags.isWindows && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>In Edge or Chrome, open browser menu then Apps then Install this site as an app.</li>
                  <li>Launch the installed app from Start menu.</li>
                  <li>Right-click its icon and choose Pin to taskbar.</li>
                </ol>
              )}

              {deviceFlags.isDesktop && !deviceFlags.isWindows && (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>In Chrome or Edge, open browser menu then Apps then Install this site as an app.</li>
                  <li>Launch it from Applications or Dock after install.</li>
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
