import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-warning text-warning-foreground rounded-lg shadow-lg p-4 flex items-center gap-3">
        <WifiOff className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">No Connection</p>
          <p className="text-xs opacity-90">Some features may be limited</p>
        </div>
      </div>
    </div>
  );
}
