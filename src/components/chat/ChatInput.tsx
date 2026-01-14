import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  onSend: (text: string) => Promise<void> | void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const sending = false;

  const submit = async (e?: any) => {
    e?.preventDefault();
    if (!text.trim()) return;
    try {
      await onSend(text.trim());
      setText('');
    } catch (err) {
      // swallow for now
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 p-2 border-t border-border bg-background">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message..."
        className="flex-1"
      />
      <Button type="submit" className="whitespace-nowrap">Send</Button>
    </form>
  );
}
