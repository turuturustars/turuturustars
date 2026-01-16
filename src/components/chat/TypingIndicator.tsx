import type { TypingUser } from '@/hooks/useRealtimeChat';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].full_name} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].full_name} and ${typingUsers[1].full_name} are typing`;
    } else {
      return `${typingUsers[0].full_name} and ${typingUsers.length - 1} others are typing`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        {/* Animated dots */}
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ 
                animationDelay: `${i * 0.15}s`, 
                animationDuration: '1s' 
              }}
            />
          ))}
        </div>
        
        {/* Typing text */}
        <span className="text-xs text-muted-foreground italic">
          {getTypingText()}
        </span>
      </div>
    </div>
  );
}