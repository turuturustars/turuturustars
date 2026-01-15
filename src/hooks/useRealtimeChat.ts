import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: any;
}

export function useRealtimeChat(roomId = 'global') {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const channelRef = useRef<any | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, room_id, sender_id, content, created_at, sender_profile:profiles(id, full_name, photo_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (mounted && !error && data) {
        setMessages((data as any) as ChatMessage[]);
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`public-messages-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const id = payload.old?.id;
          if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Lightweight presence: upsert user status if table exists
    const trackPresence = async () => {
      if (!user) return;
      try {
        await supabase.from('user_status').upsert({ user_id: user.id, status: 'online', last_seen: new Date().toISOString() } as any);
      } catch (e) {
        // ignore if table doesn't exist
      }

      const uChannel = supabase
        .channel(`public-user_status`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_status' }, (p: any) => {
          // fetch current online users
          fetchOnlineUsers();
        })
        .subscribe();

      // clean up presence on unload
      const cleanup = async () => {
        try {
          await supabase.from('user_status').upsert({ user_id: user.id, status: 'offline', last_seen: new Date().toISOString() } as any);
        } catch {}
        supabase.removeChannel(uChannel);
      };

      window.addEventListener('beforeunload', cleanup);
      return () => {
        window.removeEventListener('beforeunload', cleanup);
        cleanup();
      };
    };

    const fetchOnlineUsers = async () => {
      try {
        const { data } = await supabase.from('user_status').select('user_id' as any).eq('status', 'online');
        setOnlineUsers((data || []).map((r: any) => r.user_id));
      } catch (e) {
        // ignore
      }
    };

    fetchOnlineUsers();
    const cleanupPresencePromise = trackPresence();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      if (cleanupPresencePromise && typeof cleanupPresencePromise === 'function') cleanupPresencePromise();
    };
  }, [roomId, user]);

  const sendMessage = async (content: string) => {
    if (!user) throw new Error('Not authenticated');
    const payload = {
      room_id: roomId,
      sender_id: user.id,
      content,
    };

    const { data, error } = await supabase.from('messages').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data;
  };

  return {
    messages,
    isLoading,
    sendMessage,
    onlineUsers,
  };
}
