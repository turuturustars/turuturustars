/**
 * Hook for detecting offline/online status and managing offline-first features
 */

import { useState, useEffect, useCallback } from 'react';

export interface OfflineCapability {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineTime: Date | null;
  offlineDuration: number; // in milliseconds
  hasServiceWorker: boolean;
  canSync: boolean;
}

export function useOfflineCapability() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(new Date());
  const [offlineDuration, setOfflineDuration] = useState(0);
  const [hasServiceWorker, setHasServiceWorker] = useState(false);

  // Check for service worker support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setHasServiceWorker(true);
    }
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      if (wasOffline) {
        setWasOffline(false);
        // Trigger any pending syncs
        globalThis.dispatchEvent(new Event('app-back-online'));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);

    return () => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Calculate offline duration
  useEffect(() => {
    if (!isOnline && lastOnlineTime) {
      const interval = setInterval(() => {
        setOfflineDuration(Date.now() - lastOnlineTime.getTime());
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setOfflineDuration(0);
    }
  }, [isOnline, lastOnlineTime]);

  const getOfflineDurationString = useCallback(() => {
    if (offlineDuration === 0) return '';

    const seconds = Math.floor(offlineDuration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, [offlineDuration]);

  return {
    isOnline,
    wasOffline,
    lastOnlineTime,
    offlineDuration,
    offlineDurationString: getOfflineDurationString(),
    hasServiceWorker,
    canSync: isOnline && wasOffline,
  };
}

/**
 * Hook for managing offline data storage and sync
 */
export function useOfflineSync(storageKey: string) {
  const [pendingSync, setPendingSync] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = useOfflineCapability();

  // Load pending sync items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`offline_${storageKey}`);
    if (stored) {
      try {
        setPendingSync(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing offline sync data:', error);
      }
    }
  }, [storageKey]);

  // Save pending sync items to localStorage
  const savePendingSync = useCallback((items: any[]) => {
    setPendingSync(items);
    localStorage.setItem(`offline_${storageKey}`, JSON.stringify(items));
  }, [storageKey]);

  // Add item to pending sync
  const addPendingSync = useCallback(
    (item: any) => {
      const updated = [...pendingSync, { ...item, syncedAt: null }];
      savePendingSync(updated);
    },
    [pendingSync, savePendingSync]
  );

  // Remove item from pending sync
  const removePendingSync = useCallback(
    (itemId: string) => {
      const updated = pendingSync.filter((item) => item.id !== itemId);
      savePendingSync(updated);
    },
    [pendingSync, savePendingSync]
  );

  // Clear all pending sync
  const clearPendingSync = useCallback(() => {
    savePendingSync([]);
    localStorage.removeItem(`offline_${storageKey}`);
  }, [storageKey, savePendingSync]);

  // Mark item as synced
  const markAsSynced = useCallback(
    (itemId: string) => {
      const updated = pendingSync.map((item) =>
        item.id === itemId ? { ...item, syncedAt: new Date().toISOString() } : item
      );
      savePendingSync(updated);
    },
    [pendingSync, savePendingSync]
  );

  // Get items that need syncing
  const getUnsyncedItems = useCallback(() => {
    return pendingSync.filter((item) => !item.syncedAt);
  }, [pendingSync]);

  // Listen for reconnection and trigger sync
  useEffect(() => {
    if (isOnline && wasOffline && getUnsyncedItems().length > 0) {
      // Dispatch event to notify app that sync is needed
      globalThis.dispatchEvent(
        new CustomEvent('offline-sync-needed', {
          detail: { items: getUnsyncedItems(), storageKey },
        })
      );
    }
  }, [isOnline, getUnsyncedItems, storageKey]);

  return {
    pendingSync,
    isSyncing,
    setIsSyncing,
    addPendingSync,
    removePendingSync,
    clearPendingSync,
    markAsSynced,
    getUnsyncedItems,
  };
}

/**
 * Hook for detecting connection quality
 */
export function useConnectionQuality() {
  const [quality, setQuality] = useState<'4g' | '3g' | '2g' | 'slow-2g' | 'unknown'>('unknown');

  useEffect(() => {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const { connection } = navigator as any;

      if (connection) {
        const updateQuality = () => {
          setQuality(connection.effectiveType || 'unknown');
        };

        updateQuality();
        connection.addEventListener('change', updateQuality);

        return () => {
          connection.removeEventListener('change', updateQuality);
        };
      }
    }
  }, []);

  const getQualityBadge = () => {
    switch (quality) {
      case '4g':
        return { color: 'green', label: 'Excellent' };
      case '3g':
        return { color: 'yellow', label: 'Good' };
      case '2g':
        return { color: 'orange', label: 'Poor' };
      case 'slow-2g':
        return { color: 'red', label: 'Very Poor' };
      default:
        return { color: 'gray', label: 'Unknown' };
    }
  };

  return {
    quality,
    getQualityBadge,
  };
}
