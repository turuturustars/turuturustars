import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, Check, CheckCheck, Clock, ChevronDown } from 'lucide-react';
import MessageReactions from './MessageReactions';
import TypingIndicator from './TypingIndicator';
import EmojiPicker from './EmojiPicker';
import type { ChatMessage, TypingUser, MessageReaction } from '@/hooks/useRealtimeChat';

interface ChatWindowEnhancedProps {
  messages: ChatMessage[];
  meId?: string | null;
  isLoading?: boolean;
  typingUsers?: TypingUser[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

// Avatar Component
const Avatar = ({ src, name, size = 'md' }: { src?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-green-500 to-emerald-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-teal-500 to-green-600',
    'from-yellow-500 to-orange-600'
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {src ? (
        <img 
          src={src} 
          alt={name}
          className="w-full h-full rounded-full object-cover ring-2 ring-background shadow-md"
        />
      ) : (
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-bold text-white ring-2 ring-background shadow-md`}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

// Message Status Indicator
const MessageStatus = ({ status = 'sent' }: { status?: string }) => {
  const statusConfig = {
    sending: { icon: Clock, className: 'text-muted-foreground/60', size: 12 },
    sent: { icon: Check, className: 'text-muted-foreground/60', size: 12 },
    delivered: { icon: CheckCheck, className: 'text-muted-foreground/60', size: 12 },
    read: { icon: CheckCheck, className: 'text-blue-500', size: 12 }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sent;
  const Icon = config.icon;

  return <Icon className={config.className} size={config.size} />;
};

// Time formatter
const formatTime = (date: string) => {
  const now = new Date();
  const msgDate = new Date(date);
  const diffMs = now.getTime() - msgDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Date Divider Component
const DateDivider = ({ date }: { date: string }) => {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label = msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  
  if (msgDate.toDateString() === today.toDateString()) {
    label = 'Today';
  } else if (msgDate.toDateString() === yesterday.toDateString()) {
    label = 'Yesterday';
  }

  return (
    <div className="flex items-center justify-center my-6">
      <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-muted/50 backdrop-blur-sm border border-border/30 shadow-sm">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-border" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-border" />
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="flex-1 flex flex-col gap-4 px-4 py-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''} animate-pulse`}>
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className={`flex flex-col gap-2 ${i % 2 === 0 ? 'items-end' : ''}`}>
          <div className="h-3 w-20 bg-muted rounded" />
          <div className={`h-16 rounded-2xl bg-muted ${i % 2 === 0 ? 'w-48 rounded-br-none' : 'w-56 rounded-bl-none'}`} />
        </div>
      </div>
    ))}
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
    <div className="w-full max-w-md text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full animate-pulse" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl">
          <MessageCircle className="w-10 h-10 text-primary-foreground" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wide">
          Community Chat
        </div>
        <h3 className="font-bold text-lg sm:text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Be the first to say hello
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Share updates, ask questions, or welcome new members. Your first message sets the tone.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm">
          <div className="font-semibold text-foreground">Introduce yourself</div>
          <div className="text-muted-foreground">Name, role, and interest.</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm">
          <div className="font-semibold text-foreground">Ask a question</div>
          <div className="text-muted-foreground">Get help fast.</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm">
          <div className="font-semibold text-foreground">Share an update</div>
          <div className="text-muted-foreground">Keep everyone aligned.</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {['Introduce yourself', 'Share a win', 'Post a question'].map((label) => (
          <span
            key={label}
            className="rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  </div>
);
export default function ChatWindowEnhanced({ 
  messages, 
  meId, 
  isLoading,
  typingUsers = [],
  onToggleReaction,
}: ChatWindowEnhancedProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const threshold = 100;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
    setIsNearBottom(isNearBottom);
    setShowScrollButton(!isNearBottom);
    if (isNearBottom && messages.length > 0) {
      setLastSeenMessageId(messages[messages.length - 1].id);
    }
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (!lastSeenMessageId) {
      setLastSeenMessageId(messages[messages.length - 1].id);
      return;
    }
    if (isNearBottom) {
      setLastSeenMessageId(messages[messages.length - 1].id);
    }
  }, [messages.length, isNearBottom, lastSeenMessageId, messages]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (messages.length === 0) {
    return <EmptyState />;
  }

  // Group messages by date
  const groupedMessages: { [key: string]: ChatMessage[] } = {};
  messages.forEach(msg => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!groupedMessages[dateKey]) {
      groupedMessages[dateKey] = [];
    }
    groupedMessages[dateKey].push(msg);
  });

  const messageIndex = new Map(messages.map((m, i) => [m.id, i]));
  const lastSeenIndex = lastSeenMessageId
    ? messageIndex.get(lastSeenMessageId) ?? messages.length - 1
    : messages.length - 1;

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
      {/* Gradient Overlay */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-card/80 to-transparent pointer-events-none z-10" />
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--primary) / 0.3) transparent'
        }}
      >
        <div className="space-y-1">
          {Object.entries(groupedMessages).map(([date, msgs], groupIdx) => (
            <div key={date}>
              {groupIdx > 0 && <DateDivider date={date} />}
              
              {msgs.map((m, idx) => {
                const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                const nextMsg = idx < msgs.length - 1 ? msgs[idx + 1] : null;
                const isSameSender = prevMsg?.sender_id === m.sender_id;
                const isNextSameSender = nextMsg?.sender_id === m.sender_id;
                const isOwnMessage = m.sender_id === meId;
                const senderName = m.sender_profile?.full_name || 'Member';
                const globalIndex = messageIndex.get(m.id) ?? -1;
                const isUnread = showScrollButton && globalIndex > lastSeenIndex;
                const showUnreadDivider = showScrollButton && globalIndex === lastSeenIndex + 1;

                const showAvatar = !isNextSameSender;
                const showName = !isOwnMessage && !isSameSender;
                const marginTop = !isSameSender ? 'mt-4' : 'mt-0.5';

                return (
                  <div key={m.id}>
                    {showUnreadDivider && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-primary/30" />
                        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          New messages
                        </span>
                        <div className="flex-1 h-px bg-primary/30" />
                      </div>
                    )}
                    <div
                      className={`flex items-end gap-2 sm:gap-2.5 ${isOwnMessage ? 'justify-end' : 'justify-start'} group ${marginTop} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                      onMouseEnter={() => setHoveredMessageId(m.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                    {/* Left Avatar */}
                    {!isOwnMessage && (
                      <div className="shrink-0 self-end mb-0.5">
                        {showAvatar ? (
                          <Avatar 
                            src={m.sender_profile?.photo_url} 
                            name={senderName}
                            size="md"
                          />
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    )}

                    {/* Message Content */}
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] min-w-0`}>
                      {/* Sender Name */}
                      {showName && (
                        <div className="flex items-center gap-1.5 px-3 mb-1">
                          <span className="text-xs font-bold text-foreground/90">
                            {senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatTime(m.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className="relative">
                        <div
                          className={`relative px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl break-words transition-all duration-200 ${
                            isOwnMessage
                              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm shadow-lg hover:shadow-xl'
                              : 'bg-muted/90 text-foreground rounded-bl-sm border border-border/40 hover:border-border shadow-sm hover:shadow-md backdrop-blur-sm'
                          } ${isUnread ? 'ring-1 ring-primary/30 bg-primary/5' : ''}`}
                        >
                          <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </p>
                          
                          {/* Message Footer */}
                          <div className={`flex items-center gap-1.5 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] transition-opacity duration-200 ${
                              hoveredMessageId === m.id || isOwnMessage ? 'opacity-100' : 'opacity-0'
                            } ${isOwnMessage ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwnMessage && <MessageStatus status="sent" />}
                          </div>
                        </div>

                        {/* Quick reaction picker on hover */}
                        {hoveredMessageId === m.id && onToggleReaction && (
                          <div className={`absolute -top-8 ${isOwnMessage ? 'right-0' : 'left-0'} bg-background border border-border rounded-full px-2 py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 z-20`}>
                            <div className="flex gap-1">
                              {['👍', '❤️', '😂', '🎉'].map((emoji) => (
                                <button 
                                  key={emoji}
                                  onClick={() => onToggleReaction(m.id, emoji)}
                                  className="hover:scale-125 transition-transform text-base"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <EmojiPicker 
                                onSelect={(emoji) => onToggleReaction(m.id, emoji)}
                                trigger={
                                  <button className="hover:scale-110 transition-transform text-muted-foreground hover:text-foreground text-sm px-1">
                                    +
                                  </button>
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Reactions Display */}
                        {m.reactions && m.reactions.length > 0 && onToggleReaction && (
                          <MessageReactions
                            reactions={m.reactions}
                            currentUserId={meId}
                            onToggleReaction={(emoji) => onToggleReaction(m.id, emoji)}
                            compact
                          />
                        )}
                      </div>
                    </div>

                    {/* Right Avatar */}
                    {isOwnMessage && (
                      <div className="shrink-0 self-end mb-0.5">
                        {showAvatar ? (
                          <Avatar 
                            src={m.sender_profile?.photo_url} 
                            name={senderName}
                            size="md"
                          />
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Scroll to Bottom Button */}
      <button
        onClick={() => scrollToBottom(true)}
        className={`absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 px-3 py-2 ${
          showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span className="text-[11px] font-semibold">New messages</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
    </div>
  );
}
