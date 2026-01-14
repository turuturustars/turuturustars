import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/hooks/useRealtimeChat';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ChatWindowProps {
  messages: ChatMessage[];
  meId?: string | null;
}

export default function ChatWindow({ messages, meId }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={`flex items-start gap-2 ${m.sender_id === meId ? 'justify-end' : 'justify-start'}`}>
          <div className="shrink-0">
            <Avatar>
              {m.sender_profile?.photo_url ? (
                <AvatarImage src={m.sender_profile.photo_url} alt={m.sender_profile.full_name || 'Member'} />
              ) : (
                <AvatarFallback>{(m.sender_profile?.full_name || 'M').slice(0,1)}</AvatarFallback>
              )}
            </Avatar>
          </div>

          <div className={`${m.sender_id === meId ? 'text-right' : 'text-left'} max-w-[70%]` }>
            <div className={`inline-block px-3 py-1.5 rounded-lg ${m.sender_id === meId ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-foreground'}`}>
              {m.content}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
