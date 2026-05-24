import { useCallback, useEffect, useRef, useState } from 'react';
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
  recipient_id?: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
  updated_at?: string | null;
  sender_profile?: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
}

type JsonProfile = {
  id?: unknown;
  full_name?: unknown;
  photo_url?: unknown;
} | null;

type JsonPresence = {
  status?: unknown;
  last_seen?: unknown;
  is_online?: unknown;
} | null;

type PrivateMessageRow = {
  id?: unknown;
  conversation_id?: unknown;
  sender_id?: unknown;
  recipient_id?: unknown;
  content?: unknown;
  read_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  sender_profile?: JsonProfile;
};

type PrivateConversationSummaryRow = {
  id?: unknown;
  participant_one?: unknown;
  participant_two?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  other_participant?: JsonProfile;
  last_message?: PrivateMessageRow | null;
  unread_count?: unknown;
  other_participant_presence?: JsonPresence;
};

const PRESENCE_HEARTBEAT_MS = 5 * 60 * 1000;
const CONVERSATION_LIMIT = 50;
const MESSAGE_LIMIT = 100;
const REFRESH_DEBOUNCE_MS = 900;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapProfile(profile: JsonProfile): PrivateMessage['sender_profile'] {
  const id = toStringValue(profile?.id);
  if (!id) return undefined;

  return {
    id,
    full_name: toStringValue(profile?.full_name) || 'Member',
    photo_url: typeof profile?.photo_url === 'string' ? profile.photo_url : null,
  };
}

function mapMessage(row: PrivateMessageRow | null | undefined): PrivateMessage | undefined {
  const id = toStringValue(row?.id);
  const conversationId = toStringValue(row?.conversation_id);
  const senderId = toStringValue(row?.sender_id);
  const content = toStringValue(row?.content);
  const createdAt = toStringValue(row?.created_at);

  if (!id || !conversationId || !senderId || !createdAt) return undefined;

  return {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: typeof row?.recipient_id === 'string' ? row.recipient_id : null,
    content,
    read_at: typeof row?.read_at === 'string' ? row.read_at : null,
    created_at: createdAt,
    updated_at: typeof row?.updated_at === 'string' ? row.updated_at : null,
    sender_profile: mapProfile(row?.sender_profile ?? null),
  };
}

function mapConversation(row: PrivateConversationSummaryRow): PrivateConversation | undefined {
  const id = toStringValue(row.id);
  const participantOne = toStringValue(row.participant_one);
  const participantTwo = toStringValue(row.participant_two);
  const createdAt = toStringValue(row.created_at);
  const updatedAt = toStringValue(row.updated_at);

  if (!id || !participantOne || !participantTwo || !createdAt || !updatedAt) return undefined;

  const presenceStatus = row.other_participant_presence?.status === 'online' ? 'online' : 'offline';

  return {
    id,
    participant_one: participantOne,
    participant_two: participantTwo,
    created_at: createdAt,
    updated_at: updatedAt,
    other_participant: mapProfile(row.other_participant ?? null),
    last_message: mapMessage(row.last_message),
    unread_count: toNumber(row.unread_count),
    other_participant_presence: {
      status: presenceStatus,
      last_seen:
        typeof row.other_participant_presence?.last_seen === 'string'
          ? row.other_participant_presence.last_seen
          : null,
      is_online: row.other_participant_presence?.is_online === true,
    },
  };
}

function sortMessages(messages: PrivateMessage[]): PrivateMessage[] {
  return [...messages].sort((a, b) => {
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return timeDiff || a.id.localeCompare(b.id);
  });
}

function mergeMessage(existing: PrivateMessage | undefined, incoming: PrivateMessage): PrivateMessage {
  return {
    ...existing,
    ...incoming,
    sender_profile: incoming.sender_profile ?? existing?.sender_profile,
  };
}

export function usePrivateMessages(conversationId?: string) {
  const { user, canInteract } = useAuth();
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible'
  );
  const conversationsRef = useRef<PrivateConversation[]>([]);
  const conversationIdRef = useRef<string | undefined>(conversationId);
  const refreshTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const enrichMessage = useCallback((message: PrivateMessage): PrivateMessage => {
    if (message.sender_profile) return message;

    const conversation = conversationsRef.current.find((item) => item.id === message.conversation_id);
    const otherParticipant = conversation?.other_participant;
    if (otherParticipant && message.sender_id === otherParticipant.id) {
      return { ...message, sender_profile: otherParticipant };
    }

    return message;
  }, []);

  const appendOrUpdateMessage = useCallback((message: PrivateMessage) => {
    const enriched = enrichMessage(message);

    setMessages((previous) => {
      const existing = previous.find((item) => item.id === enriched.id);
      const merged = mergeMessage(existing, enriched);
      const next = previous.some((item) => item.id === enriched.id)
        ? previous.map((item) => (item.id === enriched.id ? merged : item))
        : [...previous, merged];

      return sortMessages(next).slice(-MESSAGE_LIMIT);
    });
  }, [enrichMessage]);

  const updateConversationWithMessage = useCallback((message: PrivateMessage, countAsUnread: boolean) => {
    setConversations((previous) => {
      const index = previous.findIndex((conversation) => conversation.id === message.conversation_id);
      if (index === -1) return previous;

      const next = [...previous];
      const existing = next[index];
      next[index] = {
        ...existing,
        updated_at: message.created_at,
        last_message: mergeMessage(existing.last_message, enrichMessage(message)),
        unread_count: countAsUnread ? (existing.unread_count ?? 0) + 1 : existing.unread_count ?? 0,
      };

      return next.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [enrichMessage]);

  const setConversationRead = useCallback((targetConversationId: string) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === targetConversationId
          ? { ...conversation, unread_count: 0 }
          : conversation
      )
    );
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_private_conversation_summaries' as never, {
        p_limit: CONVERSATION_LIMIT,
        p_offset: 0,
      } as never);

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      setConversations(
        rows
          .map((row) => mapConversation(row as PrivateConversationSummaryRow))
          .filter((row): row is PrivateConversation => Boolean(row))
      );
    } catch (err) {
      console.error('Error in fetchConversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const scheduleConversationsRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void fetchConversations();
    }, REFRESH_DEBOUNCE_MS);
  }, [fetchConversations]);

  const markConversationRead = useCallback(async (targetConversationId: string) => {
    if (!canInteract) return;

    setConversationRead(targetConversationId);

    const { error } = await supabase.rpc('mark_private_conversation_read' as never, {
      _conversation_id: targetConversationId,
    } as never);

    if (error) {
      console.error('Error marking private messages as read:', error);
    }
  }, [canInteract, setConversationRead]);

  const fetchMessages = useCallback(async () => {
    if (!user || !conversationId) {
      setMessages([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_private_messages' as never, {
        p_conversation_id: conversationId,
        p_limit: MESSAGE_LIMIT,
        p_before: null,
      } as never);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      setMessages(
        rows
          .map((row) => mapMessage(row as PrivateMessageRow))
          .filter((row): row is PrivateMessage => Boolean(row))
      );

      void markConversationRead(conversationId);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
    }
  }, [conversationId, markConversationRead, user]);

  useEffect(() => {
    if (isPageVisible) {
      void fetchConversations();
    }
  }, [fetchConversations, isPageVisible]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    if (isPageVisible) {
      void fetchMessages();
    }
  }, [conversationId, fetchMessages, isPageVisible]);

  useEffect(() => {
    if (!user || !conversationId || !isPageVisible) return undefined;

    const channel = supabase
      .channel(`private-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = mapMessage(payload.new as PrivateMessageRow);
          if (!message) return;

          appendOrUpdateMessage(message);
          updateConversationWithMessage(message, false);

          if (message.sender_id !== user.id) {
            void markConversationRead(conversationId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = mapMessage(payload.new as PrivateMessageRow);
          if (!message) return;

          appendOrUpdateMessage(message);
          updateConversationWithMessage(message, false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = toStringValue((payload.old as { id?: unknown } | null)?.id);
          if (deletedId) {
            setMessages((previous) => previous.filter((message) => message.id !== deletedId));
          }
          scheduleConversationsRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    appendOrUpdateMessage,
    conversationId,
    isPageVisible,
    markConversationRead,
    scheduleConversationsRefresh,
    updateConversationWithMessage,
    user,
  ]);

  useEffect(() => {
    if (!user || !isPageVisible) return undefined;

    const channel = supabase
      .channel(`private-inbox-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const message = mapMessage(payload.new as PrivateMessageRow);
          if (!message || message.conversation_id === conversationIdRef.current) return;

          const knownConversation = conversationsRef.current.some(
            (conversation) => conversation.id === message.conversation_id
          );

          if (knownConversation) {
            updateConversationWithMessage(message, true);
          } else {
            scheduleConversationsRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPageVisible, scheduleConversationsRefresh, updateConversationWithMessage, user]);

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
    if (!user || !isPageVisible) return undefined;

    void updateOwnPresence('online');
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void updateOwnPresence('online');
      }
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [isPageVisible, updateOwnPresence, user]);

  useEffect(() => {
    if (!user) return undefined;

    const handleOffline = () => {
      void updateOwnPresence('offline');
    };

    window.addEventListener('beforeunload', handleOffline);
    window.addEventListener('pagehide', handleOffline);

    return () => {
      window.removeEventListener('beforeunload', handleOffline);
      window.removeEventListener('pagehide', handleOffline);
      void updateOwnPresence('offline');
    };
  }, [updateOwnPresence, user]);

  const startConversation = async (otherUserId: string) => {
    if (!user) throw new Error('Not authenticated');
    if (!canInteract) throw new Error('Your account is currently read-only');

    const { data, error } = await supabase.rpc('start_private_conversation' as never, {
      p_other_user_id: otherUserId,
    } as never);

    if (error) throw error;

    const nextConversationId = String(data || '');
    if (!nextConversationId) throw new Error('Could not start conversation');

    await fetchConversations();
    return nextConversationId;
  };

  const sendPrivateMessage = async (content: string) => {
    if (!user || !conversationId) throw new Error('Not authenticated or no conversation');
    if (!canInteract) throw new Error('Your account is currently read-only');

    const { data, error } = await supabase.rpc('send_private_message' as never, {
      p_conversation_id: conversationId,
      p_content: content,
    } as never);

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const message = mapMessage(row as PrivateMessageRow);
    if (!message) throw new Error('Message was sent but could not be loaded');

    appendOrUpdateMessage(message);
    updateConversationWithMessage(message, false);
    return message;
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
