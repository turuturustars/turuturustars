import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Users, ChevronDown, Circle, Sparkles, Send } from 'lucide-react';
import ChatWindowEnhanced from './ChatWindowEnhanced';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useAuth } from '@/hooks/useAuth';

// Mock components - replace with your actual imports
const Button = ({ children, variant = 'default', size = 'default', className = '', onClick, title, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
      ${size === 'icon' ? 'h-9 w-9' : 'px-4 py-2 h-10'}
      ${variant === 'ghost' ? 'hover:bg-accent/10 active:bg-accent/20' : ''}
      ${variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' : ''}
      ${className}`}
  >
    {children}
  </button>
);

const ChatWindow = ({ messages, meId, isLoading }: any) => (
  <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth">
    {isLoading ? (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="relative">
            <Circle className="w-8 h-8 animate-ping absolute opacity-20" />
            <Circle className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <p className="text-sm">Loading messages...</p>
        </div>
      </div>
    ) : messages.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-primary/60" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No messages yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Be the first to start the conversation! Say hello to the community.
        </p>
      </div>
    ) : (
      messages.map((msg: any, i: number) => (
        <div
          key={i}
          className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            msg.userId === meId ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-xs
            ${msg.userId === meId ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'}`}>
            {msg.userName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className={`flex flex-col gap-1 max-w-[75%] ${msg.userId === meId ? 'items-end' : ''}`}>
            <span className="text-xs font-medium text-muted-foreground px-1">
              {msg.userId === meId ? 'You' : msg.userName || 'User'}
            </span>
            <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
              msg.userId === meId
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted rounded-tl-sm'
            }`}>
              <p className="text-sm leading-relaxed break-words">{msg.text}</p>
            </div>
            <span className="text-xs text-muted-foreground/60 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))
    )}
  </div>
);

const ChatInput = ({ onSend }: any) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const suggestions = ['Introduce yourself', 'Ask a question', 'Share an update'];

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-border/50 bg-card/95 backdrop-blur-sm p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {suggestions.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setText(label)}
            className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-all duration-200"
          >
            {label}
          </button>
        ))}
        {text.length > 0 && (
          <button
            type="button"
            onClick={() => setText('')}
            className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-all duration-200"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            disabled={isSending}
            rows={2}
            maxLength={500}
            className="w-full px-4 py-2.5 rounded-2xl bg-muted border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm disabled:opacity-50 resize-none"
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>{text.length}/500</span>
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          variant="primary"
          className="rounded-full px-6 shadow-md hover:shadow-lg active:scale-95 h-11"
        >
          {isSending ? (
            <Circle className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

const ChatHighlights = () => (
  <div className="px-3 sm:px-4 py-2 border-b border-border/30 bg-gradient-to-r from-muted/40 via-card/60 to-muted/40">
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 font-semibold">
        Live community
      </span>
      <span className="rounded-full border border-border/60 px-2.5 py-1">
        Reactions enabled
      </span>
      <span className="rounded-full border border-border/60 px-2.5 py-1">
        Typing indicators
      </span>
    </div>
  </div>
);

const StarterPrompt = () => (
  <div className="px-3 sm:px-4 py-3 border-b border-border/30 bg-card/70">
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card/80 p-3 sm:p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
          Tip
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            Start strong with a quick intro
          </div>
          <div className="text-xs text-muted-foreground">
            Try: "Hello, I am [name], I handle [role], and I am excited about [topic]."
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {['Introduce yourself', 'Ask for help', 'Share a win'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-1 text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main Component
export default function ChatSidebar({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const { messages, isLoading, typingUsers, onlineUsers, sendMessage, toggleReaction } = useRealtimeChat('global');
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const onlineCountLabel = onlineUsers.length === 1 ? '1 online' : `${onlineUsers.length} online`;

  return (
    <aside
      className={`fixed inset-y-0 right-0 top-14 sm:top-16 w-full sm:max-w-md bg-gradient-to-b from-card to-card/98 border-l border-border/50 z-50 flex flex-col shadow-2xl transition-all duration-500 ease-out ${
        isExpanded ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%-3rem)]'
      }`}
    >
      {/* Collapse Toggle (Mobile & Desktop) */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-0 top-20 -translate-x-full bg-primary text-primary-foreground rounded-l-lg px-2 py-3 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-card" />
        </button>
      )}

      {/* Enhanced Header with Glassmorphism */}
      <div className="border-b border-border/30 bg-gradient-to-r from-primary/5 via-card to-primary/5 backdrop-blur-md relative overflow-hidden">
        {/* Animated Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" style={{ animationDuration: '3s' }} />
        
        <div className="relative flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card animate-pulse" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-base sm:text-lg flex items-center gap-2">
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Community Chat
                </span>
                <Sparkles className="w-4 h-4 text-primary/60 animate-pulse" />
              </div>
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
                <div className="flex -space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-card" />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 border border-border/60 px-2 py-0.5">
                  {onlineCountLabel}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95"
              onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              title="View online members"
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95 hidden sm:flex"
              onClick={() => setIsExpanded(false)}
              title="Minimize chat"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-200 active:scale-95"
              onClick={onClose}
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Enhanced Online Users Panel */}
        {showOnlineUsers && (
          <div className="px-3 sm:px-4 py-3 border-t border-border/30 bg-gradient-to-b from-muted/50 to-muted/30 backdrop-blur-sm max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-foreground/80 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Active Members
              </div>
              <div className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                {onlineUsers.length}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {onlineUsers.slice(0, 8).map((onlineUser, i) => (
                <div
                  key={onlineUser.user_id}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-card/80 hover:bg-card border border-border/30 hover:border-primary/30 transition-all duration-200 hover:shadow-md cursor-pointer"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="relative flex-shrink-0">
                    {onlineUser.photo_url ? (
                      <img 
                        src={onlineUser.photo_url} 
                        alt={onlineUser.full_name}
                        className="w-7 h-7 rounded-full object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {onlineUser.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
                  </div>
                  <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                    {onlineUser.full_name}
                  </span>
                </div>
              ))}
            </div>
            
            {onlineUsers.length > 8 && (
              <div className="mt-3 text-center">
                <button className="text-xs text-primary hover:text-primary/80 font-semibold hover:underline transition-all">
                  View all {onlineUsers.length} members
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ChatHighlights />
      <StarterPrompt />

      {/* Chat Messages with Custom Scrollbar */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-muted/20 pointer-events-none" />
        <ChatWindowEnhanced 
          messages={messages} 
          meId={user?.id ?? null} 
          isLoading={isLoading}
          typingUsers={typingUsers}
          onToggleReaction={toggleReaction}
        />
      </div>

      {/* Enhanced Chat Input */}
      <ChatInput onSend={sendMessage} />

      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        
        /* Custom Scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.3);
          border-radius: 999px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
      `}</style>
    </aside>
  );
}
