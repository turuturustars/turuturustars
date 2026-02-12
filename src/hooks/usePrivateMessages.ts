import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PrivateConversation {
  id: string;
  participant_one: string;
  participant_two: string;
  created_at: string;
  updated_at: string;
  other_participant?: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
  last_message?: PrivateMessage;
  unread_count?: number;
  other_participant_presence?: {
    status: 'online' | 'offline';
    last_seen: string | null;
    is_online: boolean;
  };
}

export interface PrivateMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender_profile?: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
}

const PRESENCE_ACTIVE_WINDOW_MS = 2 * 60 * 1000;

export function usePrivateMessages(conversationId?: string) {
  const { user, canInteract } = useAuth();
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('private_conversations')
        .select('id, participant_one, participant_two, updated_at, created_at')
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      if (data && data.length > 0) {
        // Get other participant profiles
        const otherParticipantIds = data.map((c: any) => 
          c.participant_one === user.id ? c.participant_two : c.participant_one
        );

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, photo_url')
          .in('id', otherParticipantIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const { data: statusRows } = await supabase
          .from('user_status')
          .select('user_id, status, last_seen')
          .in('user_id', otherParticipantIds);

        const statusMap = new Map(
          (statusRows || []).map((row) => [
            row.user_id,
            {
              status: row.status === 'online' ? 'online' : 'offline',
              last_seen: row.last_seen,
            },
          ])
        );

        // Get last messages and unread counts
        const conversationsWithData = await Promise.all(
          data.map(async (conv: any) => {
            const otherId = conv.participant_one === user.id ? conv.participant_two : conv.participant_one;
            const rawPresence = statusMap.get(otherId);
            const lastSeen = rawPresence?.last_seen || null;
            const isOnline =
              rawPresence?.status === 'online' &&
              !!lastSeen &&
              Date.now() - new Date(lastSeen).getTime() <= PRESENCE_ACTIVE_WINDOW_MS;
            
            // Get last message
            const { data: lastMsgData } = await supabase
              .from('private_messages')
              .select('id, sender_id, content, created_at, read_at, conversation_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get unread count
            const { count } = await supabase
              .from('private_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .is('read_at', null);

            return {
              ...conv,
              other_participant: profileMap.get(otherId),
              other_participant_presence: {
                status: rawPresence?.status || 'offline',
                last_seen: lastSeen,
                is_online: isOnline,
              },
              last_message: lastMsgData || undefined,
              unread_count: count || 0,
            };
          })
        );

        setConversations(conversationsWithData);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error('Error in fetchConversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m: any) => m.sender_id))] as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, photo_url')
          .in('id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const messagesWithProfiles: PrivateMessage[] = data.map((msg: any) => ({
          ...msg,
          sender_profile: profileMap.get(msg.sender_id),
        }));

        setMessages(messagesWithProfiles);

        // Mark messages as read
        if (canInteract) {
          const { error: markReadError } = await supabase.rpc('mark_private_conversation_read', {
            _conversation_id: conversationId,
          });

          if (markReadError) {
            console.error('Error marking private messages as read:', markReadError);
          } else {
            await fetchConversations();
          }
        }
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Error in fetchMessages:', err);
    }
  }, [user, conversationId, fetchConversations, canInteract]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (conversationId) {
      void fetchMessages();

      const channel = supabase
        .channel(`private-messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'private_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => {
            void fetchMessages();
            void fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, fetchConversations, fetchMessages]);

  useEffect(() => {
    if (!user) return;

    const participantOneChannel = supabase
      .channel(`private-conversations-one-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_conversations',
          filter: `participant_one=eq.${user.id}`,
        },
        () => {
          void fetchConversations();
        }
      )
      .subscribe();

    const participantTwoChannel = supabase
      .channel(`private-conversations-two-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_conversations',
          filter: `participant_two=eq.${user.id}`,
        },
        () => {
          void fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantOneChannel);
      supabase.removeChannel(participantTwoChannel);
    };
  }, [user, fetchConversations]);

  const updateOwnPresence = useCallback(
    async (status: 'online' | 'offline') => {
      if (!user) return;

      try {
        await supabase.from('user_status').upsert({
          user_id: user.id,
          status,
          last_seen: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error updating private chat presence:', error);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    void updateOwnPresence('online');
    const heartbeat = window.setInterval(() => {
      void updateOwnPresence('online');
    }, 45000);

    const handleBeforeUnload = () => {
      void updateOwnPresence('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      void updateOwnPresence('offline');
    };
  }, [user, updateOwnPresence]);

  useEffect(() => {
    if (!user) return;

    const statusChannel = supabase
      .channel(`private-user-status-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => {
          void fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [user, fetchConversations]);

  const startConversation = async (otherUserId: string) => {
    if (!user) throw new Error('Not authenticated');
    if (!canInteract) throw new Error('Your account is currently read-only');

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('private_conversations')
      .select('id')
      .or(`and(participant_one.eq.${user.id},participant_two.eq.${otherUserId}),and(participant_one.eq.${otherUserId},participant_two.eq.${user.id})`)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('private_conversations')
      .insert({
        participant_one: user.id,
        participant_two: otherUserId,
      })
      .select()
      .single();

    if (error) throw error;
    
    await fetchConversations();
    return data.id;
  };

  const sendPrivateMessage = async (content: string) => {
    if (!user || !conversationId) throw new Error('Not authenticated or no conversation');
    if (!canInteract) throw new Error('Your account is currently read-only');

    const { data, error } = await supabase
      .from('private_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('private_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    await fetchConversations();

    return data;
  };

  return {
    conversations,
    messages,
    isLoading,
    startConversation,
    sendPrivateMessage,
    refreshConversations: fetchConversations,
    refreshMessages: fetchMessages,
  };
}
