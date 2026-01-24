import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
  reactions?: MessageReaction[];
}

export interface TypingUser {
  user_id: string;
  full_name: string;
}

export interface OnlineUser {
  user_id: string;
  full_name: string;
  photo_url: string | null;
}

export function useRealtimeChat(roomId = 'global') {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      // Use type assertion for tables not in generated types yet
      const { data, error } = await (supabase.from('messages' as 'announcements') as any)
        .select('id, room_id, sender_id, content, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.error('Error fetching messages:', error);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m: any) => m.sender_id))] as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, photo_url')
          .in('id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        // Fetch reactions for all messages
        const messageIds = data.map((m: any) => m.id) as string[];
        const { data: reactions } = await (supabase.from('message_reactions' as 'announcements') as any)
          .select('id, message_id, user_id, emoji, created_at')
          .in('message_id', messageIds);

        const reactionsMap = new Map<string, MessageReaction[]>();
        (reactions || []).forEach((r: MessageReaction) => {
          const existing = reactionsMap.get(r.message_id) || [];
          reactionsMap.set(r.message_id, [...existing, r]);
        });

        const messagesWithData: ChatMessage[] = data.map((msg: any) => ({
          ...msg,
          sender_profile: profileMap.get(msg.sender_id) || undefined,
          reactions: reactionsMap.get(msg.id) || [],
        }));

        setMessages(messagesWithData);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Error in fetchMessages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data: statusData } = await (supabase.from('user_status' as 'announcements') as any)
        .select('user_id')
        .eq('status', 'online');
      
      if (statusData && statusData.length > 0) {
        const userIds = statusData.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, photo_url')
          .in('id', userIds);

        setOnlineUsers(
          (profiles || []).map(p => ({
            user_id: p.id,
            full_name: p.full_name,
            photo_url: p.photo_url
          }))
        );
      } else {
        setOnlineUsers([]);
      }
    } catch (e) {
      console.error('Error fetching online users:', e);
    }
  }, []);

  const fetchTypingUsers = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: typingData } = await (supabase.from('typing_indicators' as 'announcements') as any)
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_typing', true)
        .neq('user_id', user.id);

      if (typingData && typingData.length > 0) {
        const userIds = typingData.map((t: any) => t.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        setTypingUsers(
          (profiles || []).map(p => ({ user_id: p.id, full_name: p.full_name }))
        );
      } else {
        setTypingUsers([]);
      }
    } catch (e) {
      console.error('Error fetching typing users:', e);
    }
  }, [roomId, user]);

  const updatePresence = useCallback(async (status: 'online' | 'offline') => {
    if (!user) return;
    
    try {
      await (supabase.from('user_status' as 'announcements') as any)
        .upsert({
          user_id: user.id,
          status,
          last_seen: new Date().toISOString(),
        });
    } catch (e) {
      console.error('Error updating presence:', e);
    }
  }, [user]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!user) return;

    try {
      await (supabase.from('typing_indicators' as 'announcements') as any)
        .upsert({
          user_id: user.id,
          room_id: roomId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    } catch (e) {
      console.error('Error updating typing status:', e);
    }
  }, [user, roomId]);

  useEffect(() => {
    let mounted = true;

    fetchMessages();
    fetchOnlineUsers();
    fetchTypingUsers();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `room_id=eq.${roomId}` 
        },
        async (payload) => {
          if (!mounted) return;
          
          const newMsg = payload.new as any;
          
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, photo_url')
            .eq('id', newMsg.sender_id)
            .single();

          const messageWithProfile: ChatMessage = {
            id: newMsg.id,
            room_id: newMsg.room_id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            sender_profile: senderProfile || undefined,
            reactions: [],
          };

          setMessages((prev) => [...prev, messageWithProfile]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          if (!mounted) return;
          const id = (payload.old as any)?.id;
          if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel(`reactions-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          if (mounted) fetchMessages();
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_indicators', filter: `room_id=eq.${roomId}` },
        () => {
          if (mounted) fetchTypingUsers();
        }
      )
      .subscribe();

    // Subscribe to user status changes
    const statusChannel = supabase
      .channel('user-status-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => {
          if (mounted) fetchOnlineUsers();
        }
      )
      .subscribe();

    // Track user presence
    if (user) {
      updatePresence('online');

      const handleBeforeUnload = () => {
        updatePresence('offline');
        setTyping(false);
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        mounted = false;
        window.removeEventListener('beforeunload', handleBeforeUnload);
        updatePresence('offline');
        setTyping(false);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(reactionsChannel);
        supabase.removeChannel(typingChannel);
        supabase.removeChannel(statusChannel);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }

    return () => {
      mounted = false;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [roomId, user, fetchMessages, fetchOnlineUsers, fetchTypingUsers, updatePresence, setTyping]);

  const sendMessage = async (content: string) => {
    if (!user) throw new Error('Not authenticated');
    
    // Clear typing indicator when sending
    await setTyping(false);
    
    const { data, error } = await (supabase.from('messages' as 'announcements') as any)
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await (supabase.from('message_reactions' as 'announcements') as any)
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    
    if (error && error.code !== '23505') { // Ignore unique constraint violation
      throw error;
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await (supabase.from('message_reactions' as 'announcements') as any)
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);
    
    if (error) throw error;
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(
      r => r.user_id === user.id && r.emoji === emoji
    );
    
    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    onlineUsers,
    typingUsers,
    setTyping,
    addReaction,
    removeReaction,
    toggleReaction,
    refresh: fetchMessages,
  };
}
