import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useAuth } from '@/hooks/useAuth';
import { X, MessageCircle, Users } from 'lucide-react';

interface ChatSidebarProps {
  onClose?: () => void;
}

export default function ChatSidebar({ onClose }: ChatSidebarProps) {
  const { messages, isLoading, sendMessage, onlineUsers } = useRealtimeChat('global');
  const { user, profile } = useAuth();
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  return (
    <aside className="fixed inset-y-0 right-0 top-14 sm:top-16 w-full sm:max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Enhanced Header */}
      <div className="border-b border-border bg-gradient-to-r from-card to-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm sm:text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span>Community</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {onlineUsers.length} member{onlineUsers.length !== 1 ? 's' : ''} online
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent transition-colors"
              onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              title="Toggle online members"
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent transition-colors"
              onClick={onClose}
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Online Users Info */}
        {showOnlineUsers && (
          <div className="px-3 sm:px-4 py-2 border-t border-border/50 bg-muted/30 max-h-32 overflow-y-auto animate-in fade-in duration-200">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Online Members</div>
            <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:gap-2">
              {onlineUsers.slice(0, 6).map((userId) => (
                <div
                  key={userId}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-xs text-primary font-medium truncate"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="truncate">Member</span>
                </div>
              ))}
              {onlineUsers.length > 6 && (
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                  +{onlineUsers.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <ChatWindow messages={messages} meId={user?.id ?? null} isLoading={isLoading} />

      {/* Chat Input */}
      <ChatInput onSend={async (text) => { await sendMessage(text); }} />
    </aside>
  );
}
