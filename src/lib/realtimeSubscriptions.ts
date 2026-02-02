/**
 * Real-time subscription management - simplified
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConnectionQuality = '4g' | '3g' | '2g' | 'slow-4g' | 'unknown';

export function useConnectionQuality() {
  const [quality, setQuality] = useState<ConnectionQuality>('unknown');
  useEffect(() => {
    const conn = (navigator as { connection?: { effectiveType?: string } }).connection;
    setQuality((conn?.effectiveType as ConnectionQuality) || 'unknown');
  }, []);
  return quality;
}

type ValidTable = 'profiles' | 'contributions' | 'announcements' | 'notifications' | 'meetings' | 'welfare_cases' | 'messages';

export interface UseSubscriptionOptions {
  table: ValidTable;
  enabled?: boolean;
  onChange?: (payload: Record<string, unknown>) => void;
}

export function useRealtimeSubscription(options: UseSubscriptionOptions) {
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.enabled) return;
    setIsConnected(true);
  }, [options.enabled]);

  const unsubscribe = useCallback(async () => {
    setIsConnected(false);
  }, []);

  return { isConnected, error, unsubscribe };
}

export interface PresenceState {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  color?: string;
}

export function usePresence(userId: string, userName: string) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceState>>({});
  
  useEffect(() => {
    // Simplified presence - just track current user
    setOnlineUsers({
      [userId]: {
        userId,
        userName,
        status: 'online',
        lastSeen: new Date().toISOString(),
      }
    });
  }, [userId, userName]);

  return { onlineUsers };
}

export function useBroadcast(channel: string, onMessage?: (message: Record<string, unknown>) => void) {
  const broadcast = useCallback((message: Record<string, unknown>) => {
    console.log('Broadcast:', channel, message);
  }, [channel]);

  return { broadcast };
}
