import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import type { MessageReaction } from '@/hooks/useRealtimeChat';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId?: string | null;
  onToggleReaction: (emoji: string) => void;
  compact?: boolean;
}

export default function MessageReactions({
  reactions,
  currentUserId,
  onToggleReaction,
  compact = false,
}: MessageReactionsProps) {
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const hasReactions = Object.keys(groupedReactions).length > 0;

  if (!hasReactions && compact) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const hasUserReacted = reactionList.some(r => r.user_id === currentUserId);
        
        return (
          <button
            key={emoji}
            onClick={() => onToggleReaction(emoji)}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              transition-all duration-200 hover:scale-105
              ${hasUserReacted 
                ? 'bg-primary/20 border border-primary/40 text-primary' 
                : 'bg-muted/80 border border-border/50 text-muted-foreground hover:bg-muted'
              }
            `}
            title={`${reactionList.length} reaction${reactionList.length > 1 ? 's' : ''}`}
          >
            <span className="text-sm">{emoji}</span>
            <span className="font-medium">{reactionList.length}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 border border-border/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Add reaction"
          >
            <Plus className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onToggleReaction(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
