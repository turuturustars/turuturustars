import React from 'react';
import { Button } from '@/components/ui/button';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useAuth } from '@/hooks/useAuth';

interface ChatSidebarProps {
  onClose?: () => void;
}

export default function ChatSidebar({ onClose }: ChatSidebarProps) {
  const { messages, isLoading, sendMessage, onlineUsers } = useRealtimeChat('global');
  const { user, profile } = useAuth();

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="font-semibold">Community Chat</div>
          <div className="text-xs text-muted-foreground">{onlineUsers.length} online</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>

      <ChatWindow messages={messages} meId={user?.id ?? null} />

      <ChatInput onSend={async (text) => { await sendMessage(text); }} />
    </aside>
  );
}
