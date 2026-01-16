import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Check, CheckCheck, Clock, ChevronDown } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: {
    full_name?: string;
    photo_url?: string;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ChatWindowProps {
  messages: ChatMessage[];
  meId?: string | null;
  isLoading?: boolean;
}

// Avatar Component
const Avatar = ({ src, name, size = 'md', className = '' }: { src?: string; name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
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
    <div className={`relative ${sizeClasses[size]} ${className}`}>
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

// Time formatter with smart display
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

const formatFullTime = (date: string) => {
  return new Date(date).toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
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

// Scroll to Bottom Button
const ScrollToBottom = ({ onClick, show }: { onClick: () => void; show: boolean }) => (
  <button
    onClick={onClick}
    className={`absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    }`}
  >
    <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background animate-pulse">
      3
    </div>
  </button>
);

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
  <div className="flex-1 flex items-center justify-center px-6">
    <div className="text-center space-y-4 max-w-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full animate-pulse" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl">
          <MessageCircle className="w-10 h-10 text-primary-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Start the conversation
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Be the first to send a message and connect with the community. Your message could spark something amazing! ✨
        </p>
      </div>
    </div>
  </div>
);

// Typing Indicator
const TypingIndicator = ({ userName = 'Someone' }: { userName?: string }) => (
  <div className="flex items-end gap-2 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold">
      {userName.charAt(0).toUpperCase()}
    </div>
    <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-muted/80 border border-border/50 shadow-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
          />
        ))}
      </div>
    </div>
  </div>
);

// Main Component
export default function ChatWindow({ messages, meId, isLoading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const threshold = 100;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
    setShowScrollButton(!isNearBottom);
  };

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

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Gradient Overlay */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-card/80 to-transparent pointer-events-none z-10" />
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-3 sm:px-4 py-4 scroll-smooth"
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
                
                const showAvatar = !isNextSameSender;
                const showName = !isOwnMessage && !isSameSender;
                const marginTop = !isSameSender ? 'mt-4' : 'mt-0.5';

                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 sm:gap-2.5 ${isOwnMessage ? 'justify-end' : 'justify-start'} group ${marginTop} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    onMouseEnter={() => setHoveredMessageId(m.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    {/* Left Avatar (for others) */}
                    {!isOwnMessage && (
                      <div className="shrink-0 self-end mb-0.5">
                        {showAvatar ? (
                          <Avatar 
                            src={m.sender_profile?.photo_url} 
                            name={senderName}
                            size="md"
                            className="ring-offset-2 ring-offset-background transition-transform group-hover:scale-110"
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
                      <div
                        className={`relative px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl break-words transition-all duration-200 ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm shadow-lg hover:shadow-xl'
                            : 'bg-muted/90 text-foreground rounded-bl-sm border border-border/40 hover:border-border shadow-sm hover:shadow-md backdrop-blur-sm'
                        }`}
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
                          {isOwnMessage && <MessageStatus status={m.status} />}
                        </div>

                        {/* Hover Reactions Preview */}
                        {hoveredMessageId === m.id && (
                          <div className="absolute -top-8 right-0 bg-background border border-border rounded-full px-2 py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex gap-1 text-base">
                              <button className="hover:scale-125 transition-transform">👍</button>
                              <button className="hover:scale-125 transition-transform">❤️</button>
                              <button className="hover:scale-125 transition-transform">😂</button>
                              <button className="hover:scale-125 transition-transform">🎉</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timestamp on Hover (for non-own messages) */}
                      {!isOwnMessage && !showName && hoveredMessageId === m.id && (
                        <span className="text-[10px] text-muted-foreground/60 px-3 mt-1 animate-in fade-in duration-200">
                          {formatFullTime(m.created_at)}
                        </span>
                      )}
                    </div>

                    {/* Right Avatar (for own messages) */}
                    {isOwnMessage && (
                      <div className="shrink-0 self-end mb-0.5">
                        {showAvatar ? (
                          <Avatar 
                            src={m.sender_profile?.photo_url} 
                            name={senderName}
                            size="md"
                            className="ring-offset-2 ring-offset-background transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Typing Indicator (optional - uncomment to use) */}
          {/* <TypingIndicator userName="Alice" /> */}
        </div>

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Scroll to Bottom Button */}
      <ScrollToBottom onClick={() => scrollToBottom(true)} show={showScrollButton} />

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />

      <style>{`
        /* Custom Scrollbar */
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.3);
          border-radius: 999px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
      `}</style>
    </div>
  );
}