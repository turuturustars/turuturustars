import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Paperclip, Smile } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => Promise<void> | void;
  placeholder?: string;
  maxLength?: number;
  showAttachments?: boolean;
}

export default function ChatInput({ 
  onSend, 
  placeholder = "Type your message...",
  maxLength = 2000,
  showAttachments = false
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea with smooth animation
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submit = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    const messageToSend = text.trim();
    
    // Optimistic UI - clear immediately
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSend(messageToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore text on error
      setText(messageToSend);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (desktop) or Ctrl/Cmd+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      // On mobile, allow new line with Enter, require button tap
      if (window.innerWidth >= 768) {
        e.preventDefault();
        submit();
      }
    }
    
    // Also support Ctrl/Cmd+Enter on all devices
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (text.length + pastedText.length > maxLength) {
      e.preventDefault();
      const remainingSpace = maxLength - text.length;
      const textToInsert = pastedText.substring(0, remainingSpace);
      setText(text + textToInsert);
    }
  };

  const isDisabled = sending || !text.trim();
  const charCount = text.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="flex-shrink-0 border-t border-border/40 bg-gradient-to-b from-background/95 to-background backdrop-blur-md transition-all duration-300">
      {/* Main input container */}
      <div className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div 
          className={`
            relative flex items-end gap-2 sm:gap-3
            rounded-2xl border-2 bg-card/50 backdrop-blur-sm
            transition-all duration-300 ease-out
            ${isFocused 
              ? 'border-primary/50 shadow-lg shadow-primary/5 bg-card/80' 
              : 'border-border/50 hover:border-border/80 shadow-sm'
            }
            ${sending ? 'opacity-60' : ''}
          `}
        >
          {/* Optional attachment button */}
          {showAttachments && (
            <button
              type="button"
              onClick={() => {}}
              className="ml-3 mb-2.5 sm:mb-3 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted/50 rounded-lg"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLength))}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={sending}
              className={`
                w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base
                bg-transparent border-0 outline-none resize-none
                transition-all duration-200
                placeholder:text-muted-foreground/60
                disabled:cursor-not-allowed
                max-h-40 leading-relaxed
              `}
              rows={1}
              aria-label="Message input"
            />
          </div>

          {/* Optional emoji button */}
          {showAttachments && (
            <button
              type="button"
              onClick={() => {}}
              className="mr-2 mb-2.5 sm:mb-3 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted/50 rounded-lg"
              title="Add emoji"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Send button */}
          <div className="mr-2 mb-2 sm:mr-2.5 sm:mb-2.5">
            <Button
              type="button"
              onClick={submit}
              disabled={isDisabled}
              size="icon"
              className={`
                h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl
                transition-all duration-300 ease-out
                ${!isDisabled 
                  ? 'bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20' 
                  : 'bg-muted hover:bg-muted cursor-not-allowed'
                }
              `}
              title={window.innerWidth >= 768 ? "Send (Enter)" : "Send message"}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Footer with character count and hints */}
        <div className="flex items-center justify-between mt-2 px-2 sm:px-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">
              {window.innerWidth >= 768 ? 'Press Enter to send' : 'Tap send button'}
            </span>
            <span className="hidden md:inline opacity-60">
              • Shift+Enter for new line
            </span>
          </div>
          
          {/* Character counter */}
          {charCount > 0 && (
            <div 
              className={`
                text-xs font-medium transition-colors duration-200
                ${isOverLimit 
                  ? 'text-destructive' 
                  : isNearLimit 
                    ? 'text-orange-500 dark:text-orange-400' 
                    : 'text-muted-foreground'
                }
              `}
            >
              {charCount.toLocaleString()}{maxLength && ` / ${maxLength.toLocaleString()}`}
            </div>
          )}
        </div>

        {/* Character limit warning */}
        {isOverLimit && (
          <div className="mt-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive font-medium">
              Message exceeds maximum length. Please shorten your message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}