/**
 * Real-time subscription management - prevents re-creation on every render
 * Handles connection quality, automatic reconnection, and cleanup
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Connection Quality Detection
// ============================================================================

export type ConnectionQuality = '4g' | '3g' | '2g' | 'slow-4g' | 'unknown';

export function useConnectionQuality() {
  const [quality, setQuality] = useState<ConnectionQuality>('unknown');

  useEffect(() => {
    const updateQuality = () => {
      const connection = (navigator as any).connection;
      if (!connection) {
        setQuality('unknown');
        return;
      }

      const effectiveType = connection.effectiveType as string;
      setQuality((effectiveType as ConnectionQuality) || 'unknown');
    };

    updateQuality();
    window.addEventListener('change', updateQuality);
    return () => window.removeEventListener('change', updateQuality);
  }, []);

  return quality;
}

export function getRecommendedReconnectDelay(quality: ConnectionQuality): number {
  const delays: Record<ConnectionQuality, number> = {
    '4g': 1000,
    '3g': 2000,
    '2g': 5000,
    'slow-4g': 3000,
    'unknown': 2000,
  };
  return delays[quality];
}

// ============================================================================
// Stable Subscription Hook (prevents re-creation)
// ============================================================================

export interface UseSubscriptionOptions {
  table: string;
  filter?: { column: string; operator: string; value: string };
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
  enabled?: boolean;
  autoReconnect?: boolean;
}

/**
 * Stable hook for real-time subscriptions
 * - Prevents subscription re-creation on every render
 * - Handles automatic reconnection on failure
 * - Manages connection quality
 * - Properly cleans up subscriptions
 */
export function useRealtimeSubscription(options: UseSubscriptionOptions) {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const connectionQuality = useConnectionQuality();

  // Setup subscription (once on mount)
  useEffect(() => {
    if (!options.enabled) return;

    const setupSubscription = async () => {
      try {
        setError(null);

        // Unsubscribe from old subscription if it exists
        if (subscriptionRef.current) {
          await supabase.removeChannel(subscriptionRef.current);
        }

        // Create new subscription with stable reference
        const channel = supabase.channel(
          `${options.table}-${options.filter?.column || 'all'}`,
          {
            config: {
              broadcast: { self: true },
            },
          }
        );

        let builder = channel.on<any>(
          'postgres_changes',
          {
            event: options.event || '*',
            schema: 'public',
            table: options.table,
            ...(options.filter && {
              filter: `${options.filter.column}${options.filter.operator}${options.filter.value}`,
            }),
          },
          (payload) => {
            setIsConnected(true);

            if (options.onChange) {
              options.onChange(payload);
            }

            // Dispatch specific handlers
            if (payload.eventType === 'INSERT' && options.onInsert) {
              options.onInsert(payload);
            } else if (payload.eventType === 'UPDATE' && options.onUpdate) {
              options.onUpdate(payload);
            } else if (payload.eventType === 'DELETE' && options.onDelete) {
              options.onDelete(payload);
            }
          }
        );

        // Add status listener
        builder = builder.on('system', { event: 'join' }, () => {
          setIsConnected(true);
        });

        builder = builder.on('system', { event: 'leave' }, () => {
          setIsConnected(false);

          if (options.autoReconnect !== false) {
            // Schedule reconnection with adaptive delay
            const delay = getRecommendedReconnectDelay(connectionQuality);
            reconnectTimeoutRef.current = setTimeout(() => {
              setupSubscription();
            }, delay);
          }
        });

        subscriptionRef.current = builder;

        // Subscribe
        await channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
          }
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsConnected(false);

        if (options.autoReconnect !== false) {
          const delay = getRecommendedReconnectDelay(connectionQuality);
          reconnectTimeoutRef.current = setTimeout(() => {
            setupSubscription();
          }, delay);
        }
      }
    };

    setupSubscription();

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [
    options.table,
    options.filter?.column,
    options.filter?.operator,
    options.filter?.value,
    options.event,
    options.enabled,
    connectionQuality,
  ]);

  // Memoized unsubscribe function
  const unsubscribe = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (subscriptionRef.current) {
      await supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  }, []);

  return { isConnected, error, unsubscribe };
}

// ============================================================================
// Multiple Subscriptions Manager
// ============================================================================

export interface MultiSubscriptionOptions {
  subscriptions: (UseSubscriptionOptions & { id: string })[];
  enabled?: boolean;
}

export function useMultipleSubscriptions(options: MultiSubscriptionOptions) {
  const subscriptionsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  useEffect(() => {
    if (!options.enabled) return;

    const setupAll = async () => {
      for (const subscriptionOpt of options.subscriptions) {
        try {
          const channel = supabase.channel(
            `${subscriptionOpt.table}-${subscriptionOpt.id}`,
            { config: { broadcast: { self: true } } }
          );

          const builder = channel.on<any>(
            'postgres_changes',
            {
              event: subscriptionOpt.event || '*',
              schema: 'public',
              table: subscriptionOpt.table,
              ...(subscriptionOpt.filter && {
                filter: `${subscriptionOpt.filter.column}${subscriptionOpt.filter.operator}${subscriptionOpt.filter.value}`,
              }),
            },
            (payload) => {
              setStatus((prev) => ({ ...prev, [subscriptionOpt.id]: true }));

              if (subscriptionOpt.onChange) subscriptionOpt.onChange(payload);
              if (payload.eventType === 'INSERT' && subscriptionOpt.onInsert)
                subscriptionOpt.onInsert(payload);
              if (payload.eventType === 'UPDATE' && subscriptionOpt.onUpdate)
                subscriptionOpt.onUpdate(payload);
              if (payload.eventType === 'DELETE' && subscriptionOpt.onDelete)
                subscriptionOpt.onDelete(payload);
            }
          );

          subscriptionsRef.current.set(subscriptionOpt.id, builder);

          await builder.subscribe();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setErrors((prev) => ({ ...prev, [subscriptionOpt.id]: error }));
        }
      }
    };

    setupAll();

    return () => {
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();
    };
  }, [options.subscriptions, options.enabled]);

  return { status, errors };
}

// ============================================================================
// Presence Tracking (for collaborative features)
// ============================================================================

export interface PresenceState {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  color?: string;
}

export function usePresence(userId: string, userName: string) {
  const presenceRef = useRef<RealtimeChannel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceState>>({});

  useEffect(() => {
    const channel = supabase.channel('presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, PresenceState[]>;
      const allUsers: Record<string, PresenceState> = {};

      Object.keys(state).forEach((userId) => {
        if (state[userId] && state[userId].length > 0) {
          allUsers[userId] = state[userId][0];
        }
      });

      setOnlineUsers(allUsers);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [key]: newPresences[0] as PresenceState,
      }));
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setOnlineUsers((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          userName,
          status: 'online',
          lastSeen: new Date().toISOString(),
          color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        } as PresenceState);
      }
    });

    presenceRef.current = channel;

    return () => {
      if (presenceRef.current) {
        supabase.removeChannel(presenceRef.current);
      }
    };
  }, [userId, userName]);

  return { onlineUsers };
}

// ============================================================================
// Broadcast Channel (for cross-tab communication)
// ============================================================================

export function useBroadcast(
  channel: string,
  onMessage?: (message: any) => void
) {
  const broadcastRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const broadcastChannel = supabase.channel(channel, {
      config: { broadcast: { self: false } },
    });

    broadcastChannel.on('broadcast', { event: 'message' }, ({ payload }) => {
      if (onMessage) onMessage(payload);
    });

    broadcastChannel.subscribe();
    broadcastRef.current = broadcastChannel;

    return () => {
      if (broadcastRef.current) {
        supabase.removeChannel(broadcastRef.current);
      }
    };
  }, [channel, onMessage]);

  const broadcast = useCallback(
    (message: any) => {
      if (broadcastRef.current) {
        broadcastRef.current.send({
          type: 'broadcast',
          event: 'message',
          payload: message,
        });
      }
    },
    []
  );

  return { broadcast };
}
