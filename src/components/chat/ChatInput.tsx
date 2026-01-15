import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => Promise<void> | void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  const submit = async (e?: any) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      submit(e);
    }
    // On mobile, Enter sends the message
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth < 768) {
      e.preventDefault();
      submit(e);
    }
  };

  const isDisabled = sending || !text.trim();

  return (
    <form
      onSubmit={submit}
      className="flex-shrink-0 p-2 sm:p-3 border-t border-border bg-card/95 backdrop-blur-sm"
    >
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message... (Ctrl+Enter to send)"
            disabled={sending}
            className="w-full px-3 py-2 sm:py-2.5 text-sm bg-muted/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed max-h-24"
            rows={1}
          />
        </div>
        <Button
          type="submit"
          disabled={isDisabled}
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-all active:scale-95"
          title="Send message (Ctrl+Enter)"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mt-1 px-2">
        {text.length > 0 && `${text.length} character${text.length !== 1 ? 's' : ''}`}
      </div>
    </form>
  );
}
