import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface ChatInputEnhancedProps {
  onSend: (text: string) => Promise<void> | void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  maxLength?: number;
}

export default function ChatInputEnhanced({ 
  onSend, 
  onTyping,
  placeholder = "Type your message...",
  maxLength = 2000,
}: ChatInputEnhancedProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleTyping = () => {
    if (onTyping) {
      onTyping(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const submit = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    const messageToSend = text.trim();
    
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);

    try {
      await onSend(messageToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
      setText(messageToSend);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (window.innerWidth >= 768) {
        e.preventDefault();
        submit();
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value.slice(0, maxLength));
    handleTyping();
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText.slice(0, maxLength));
      
      // Restore cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setText((prev) => (prev + emoji).slice(0, maxLength));
    }
  };

  const isDisabled = sending || !text.trim();
  const charCount = text.length;
  const isNearLimit = charCount > maxLength * 0.8;

  return (
    <div className="flex-shrink-0 border-t border-border/40 bg-gradient-to-b from-background/95 to-background backdrop-blur-md">
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
          {/* Emoji Picker */}
          <div className="ml-2 mb-2.5 sm:mb-3">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={sending}
              className="w-full px-2 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base bg-transparent border-0 outline-none resize-none transition-all duration-200 placeholder:text-muted-foreground/60 disabled:cursor-not-allowed max-h-40 leading-relaxed"
              rows={1}
              aria-label="Message input"
            />
          </div>

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
            >
              {sending ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 px-2 sm:px-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Press Enter to send</span>
            <span className="hidden md:inline opacity-60">• Shift+Enter for new line</span>
          </div>
          
          {charCount > 0 && (
            <div className={`text-xs font-medium transition-colors duration-200 ${
              isNearLimit ? 'text-orange-500' : 'text-muted-foreground'
            }`}>
              {charCount.toLocaleString()} / {maxLength.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}