-- Create message_reactions table for emoji reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create private_conversations table for 1-on-1 chats
CREATE TABLE public.private_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_one UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant_one, participant_two)
);

-- Create private_messages table
CREATE TABLE public.private_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create typing_indicators table for real-time typing status
CREATE TABLE public.typing_indicators (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_reactions
CREATE POLICY "Users can view all reactions" ON public.message_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for private_conversations
CREATE POLICY "Users can view their conversations" ON public.private_conversations FOR SELECT USING (auth.uid() = participant_one OR auth.uid() = participant_two);
CREATE POLICY "Users can create conversations" ON public.private_conversations FOR INSERT WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- RLS policies for private_messages
CREATE POLICY "Users can view their conversation messages" ON public.private_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.private_conversations WHERE id = conversation_id AND (participant_one = auth.uid() OR participant_two = auth.uid()))
);
CREATE POLICY "Users can send messages in their conversations" ON public.private_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.private_conversations WHERE id = conversation_id AND (participant_one = auth.uid() OR participant_two = auth.uid()))
);
CREATE POLICY "Users can update read status of received messages" ON public.private_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.private_conversations WHERE id = conversation_id AND (participant_one = auth.uid() OR participant_two = auth.uid()))
);

-- RLS policies for typing_indicators
CREATE POLICY "Users can view typing indicators" ON public.typing_indicators FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their typing status" ON public.typing_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their typing indicator" ON public.typing_indicators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their typing indicator" ON public.typing_indicators FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create indexes for performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_private_messages_conversation_id ON public.private_messages(conversation_id);
CREATE INDEX idx_private_messages_created_at ON public.private_messages(created_at DESC);
CREATE INDEX idx_typing_indicators_room_id ON public.typing_indicators(room_id);