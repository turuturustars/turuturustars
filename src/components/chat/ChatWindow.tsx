import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/hooks/useRealtimeChat';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  meId?: string | null;
  isLoading?: boolean;
}

const formatTime = (date: string) => {
  const now = new Date();
  const msgDate = new Date(date);
  const diffMs = now.getTime() - msgDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return msgDate.toLocaleDateString();
};

const formatFullTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ChatWindow({ messages, meId, isLoading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-muted border-t-primary animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="font-semibold text-sm text-foreground mb-1">No messages yet</p>
          <p className="text-xs text-muted-foreground">Start a conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-3 space-y-3 scrollbar-hide">
      {messages.map((m, idx) => {
        const prevMsg = idx > 0 ? messages[idx - 1] : null;
        const isSameSender = prevMsg?.sender_id === m.sender_id;
        const isOwnMessage = m.sender_id === meId;
        const senderName = m.sender_profile?.full_name || 'Member';

        return (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            {!isOwnMessage && (
              <div className="shrink-0">
                {!isSameSender ? (
                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                    {m.sender_profile?.photo_url ? (
                      <AvatarImage src={m.sender_profile.photo_url} alt={senderName} />
                    ) : (
                      <AvatarFallback className="text-xs">{senderName.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8" />
                )}
              </div>
            )}

            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[70%]`}>
              {!isOwnMessage && !isSameSender && (
                <span className="text-xs font-semibold text-foreground px-2 mb-1">{senderName}</span>
              )}
              <div
                className={`px-3 py-2 rounded-lg break-words transition-all duration-200 ${
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground rounded-br-none shadow-md'
                    : 'bg-muted/80 text-foreground rounded-bl-none border border-border/50 hover:border-border'
                }`}
              >
                <p className="text-sm leading-relaxed">{m.content}</p>
              </div>
              <span className="text-xs text-muted-foreground mt-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity" title={formatFullTime(m.created_at)}>
                {formatTime(m.created_at)}
              </span>
            </div>

            {isOwnMessage && (
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
                {!isSameSender && (
                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                    {m.sender_profile?.photo_url ? (
                      <AvatarImage src={m.sender_profile.photo_url} alt={senderName} />
                    ) : (
                      <AvatarFallback className="text-xs">{senderName.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
