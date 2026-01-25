import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/utils/errorHandler';

interface SubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
}

/**
 * Safe hook for managing Supabase realtime subscriptions
 * Prevents creating duplicate subscriptions on re-renders
 */
export function useRealtimeSubscription(
  table: string,
  callback: () => void | Promise<void>,
  options: SubscriptionOptions = {}
) {
  const {
    event = '*',
    schema = 'public',
    filter,
  } = options;

  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      return;
    }

    const channelName = `${table}_${event}_${Math.random()}`;
    
    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: event as any,
            schema,
            table,
            filter,
          },
          async (payload) => {
            try {
              await callback();
            } catch (error) {
              Logger.error(`Error in subscription callback for ${table}`, error);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
            Logger.debug(`Subscribed to ${table} changes`);
          } else if (status === 'CLOSED') {
            isSubscribedRef.current = false;
          }
        });

      subscriptionRef.current = channel;
    } catch (error) {
      Logger.error(`Failed to subscribe to ${table} changes`, error);
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        isSubscribedRef.current = false;
      }
    };
  }, [table, event, schema, filter, callback]);
}

/**
 * Hook for multiple subscriptions
 */
export function useRealtimeSubscriptions(
  subscriptions: Array<{
    table: string;
    callback: () => void | Promise<void>;
    options?: SubscriptionOptions;
  }>
) {
  const subscriptionsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    const newSubscriptions: typeof subscriptionsRef.current = [];

    try {
      subscriptions.forEach(({ table, callback, options = {} }) => {
        const { event = '*', schema = 'public', filter } = options;
        const channelName = `${table}_${event}_${Math.random()}`;

        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: event as any,
              schema,
              table,
              filter,
            },
            async () => {
              try {
                await callback();
              } catch (error) {
                Logger.error(`Error in subscription callback for ${table}`, error);
              }
            }
          )
          .subscribe();

        newSubscriptions.push(channel);
      });

      subscriptionsRef.current = newSubscriptions;
    } catch (error) {
      Logger.error('Failed to setup realtime subscriptions', error);
    }

    return () => {
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current = [];
    };
  }, [subscriptions]);
}
