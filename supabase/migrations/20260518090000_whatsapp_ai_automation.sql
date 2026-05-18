-- WhatsApp Cloud API + AI automation foundation
-- Adds storage for official WhatsApp conversations, AI knowledge, and WhatsApp-initiated M-Pesa payments.

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  profile_name TEXT,
  last_bot_mode TEXT NOT NULL DEFAULT 'public' CHECK (last_bot_mode IN ('public', 'member')),
  opted_in BOOLEAN NOT NULL DEFAULT true,
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  last_outbound_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  wa_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text',
  text_body TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received',
  status_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_purpose TEXT NOT NULL DEFAULT 'contribution' CHECK (payment_purpose IN ('contribution', 'wallet_topup')),
  contribution_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  wallet_transaction_id UUID,
  checkout_request_id TEXT UNIQUE,
  merchant_request_id TEXT,
  mpesa_transaction_id UUID REFERENCES public.mpesa_transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'stk_requested', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_table TEXT,
  source_id UUID,
  contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  bot_scope TEXT NOT NULL DEFAULT 'both' CHECK (bot_scope IN ('public', 'member', 'both')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.member_wallets(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'mpesa', 'manual', 'contribution')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_number TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_payment_intents
  DROP CONSTRAINT IF EXISTS whatsapp_payment_intents_wallet_transaction_id_fkey;

ALTER TABLE public.whatsapp_payment_intents
  ADD CONSTRAINT whatsapp_payment_intents_wallet_transaction_id_fkey
  FOREIGN KEY (wallet_transaction_id) REFERENCES public.member_wallet_transactions(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS whatsapp_status TEXT CHECK (whatsapp_status IS NULL OR whatsapp_status IN ('queued', 'sent', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS whatsapp_error TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_member_id ON public.whatsapp_contacts(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone_number ON public.whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_created ON public.whatsapp_messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_member_created ON public.whatsapp_messages(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_payment_intents_purpose_status ON public.whatsapp_payment_intents(payment_purpose, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_payment_intents_member_status ON public.whatsapp_payment_intents(member_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_payment_intents_checkout ON public.whatsapp_payment_intents(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_automation_events_status ON public.whatsapp_automation_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_active_scope_category ON public.ai_knowledge_base(is_active, bot_scope, category);
CREATE INDEX IF NOT EXISTS idx_member_wallet_transactions_member_created ON public.member_wallet_transactions(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_wallet_transactions_status ON public.member_wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_whatsapp_status ON public.notifications(whatsapp_status, created_at DESC);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officials can manage whatsapp contacts" ON public.whatsapp_contacts;
CREATE POLICY "Officials can manage whatsapp contacts"
ON public.whatsapp_contacts FOR ALL
TO authenticated
USING (public.is_official(auth.uid()))
WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS "Members can view own whatsapp contact" ON public.whatsapp_contacts;
CREATE POLICY "Members can view own whatsapp contact"
ON public.whatsapp_contacts FOR SELECT
TO authenticated
USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Officials can manage whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Officials can manage whatsapp messages"
ON public.whatsapp_messages FOR ALL
TO authenticated
USING (public.is_official(auth.uid()))
WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS "Members can view own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Members can view own whatsapp messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated
USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Officials can manage whatsapp payment intents" ON public.whatsapp_payment_intents;
CREATE POLICY "Officials can manage whatsapp payment intents"
ON public.whatsapp_payment_intents FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer') OR public.has_role(auth.uid(), 'chairperson'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer') OR public.has_role(auth.uid(), 'chairperson'));

DROP POLICY IF EXISTS "Members can view own whatsapp payment intents" ON public.whatsapp_payment_intents;
CREATE POLICY "Members can view own whatsapp payment intents"
ON public.whatsapp_payment_intents FOR SELECT
TO authenticated
USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Officials can manage whatsapp automation events" ON public.whatsapp_automation_events;
CREATE POLICY "Officials can manage whatsapp automation events"
ON public.whatsapp_automation_events FOR ALL
TO authenticated
USING (public.is_official(auth.uid()))
WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS "Officials can manage AI knowledge base" ON public.ai_knowledge_base;
CREATE POLICY "Officials can manage AI knowledge base"
ON public.ai_knowledge_base FOR ALL
TO authenticated
USING (public.is_official(auth.uid()))
WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS "Members can read active AI knowledge base" ON public.ai_knowledge_base;
CREATE POLICY "Members can read active AI knowledge base"
ON public.ai_knowledge_base FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Officials can view whatsapp notification delivery" ON public.notifications;
CREATE POLICY "Officials can view whatsapp notification delivery"
ON public.notifications FOR SELECT
TO authenticated
USING (public.is_official(auth.uid()));

DROP POLICY IF EXISTS "Officials can update whatsapp notification delivery" ON public.notifications;
CREATE POLICY "Officials can update whatsapp notification delivery"
ON public.notifications FOR UPDATE
TO authenticated
USING (public.is_official(auth.uid()))
WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS "Members can view own wallet" ON public.member_wallets;
CREATE POLICY "Members can view own wallet"
ON public.member_wallets FOR SELECT
TO authenticated
USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Officials can manage member wallets" ON public.member_wallets;
CREATE POLICY "Officials can manage member wallets"
ON public.member_wallets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer') OR public.has_role(auth.uid(), 'chairperson'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer') OR public.has_role(auth.uid(), 'chairperson'));

DROP POLICY IF EXISTS "Members can view own wallet transactions" ON public.member_wallet_transactions;
CREATE POLICY "Members can view own wallet transactions"
ON public.member_wallet_transactions FOR SELECT
TO authenticated
USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Officials can manage wallet transactions" ON public.member_wallet_transactions;
CREATE POLICY "Officials can manage wallet transactions"
ON public.member_wallet_transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer') OR public.has_role(auth.uid(), 'chairperson'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer') OR public.has_role(auth.uid(), 'chairperson'));

DROP TRIGGER IF EXISTS update_whatsapp_contacts_updated_at ON public.whatsapp_contacts;
CREATE TRIGGER update_whatsapp_contacts_updated_at
  BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_payment_intents_updated_at ON public.whatsapp_payment_intents;
CREATE TRIGGER update_whatsapp_payment_intents_updated_at
  BEFORE UPDATE ON public.whatsapp_payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_ai_knowledge_base_updated_at ON public.ai_knowledge_base;
CREATE TRIGGER update_ai_knowledge_base_updated_at
  BEFORE UPDATE ON public.ai_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_member_wallets_updated_at ON public.member_wallets;
CREATE TRIGGER update_member_wallets_updated_at
  BEFORE UPDATE ON public.member_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_member_wallet_transactions_updated_at ON public.member_wallet_transactions;
CREATE TRIGGER update_member_wallet_transactions_updated_at
  BEFORE UPDATE ON public.member_wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.credit_member_wallet(
  p_wallet_transaction_id UUID,
  p_amount NUMERIC,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_tx public.member_wallet_transactions%ROWTYPE;
BEGIN
  SELECT *
  INTO wallet_tx
  FROM public.member_wallet_transactions
  WHERE id = p_wallet_transaction_id
  FOR UPDATE;

  IF NOT FOUND OR wallet_tx.status = 'completed' THEN
    RETURN;
  END IF;

  IF wallet_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Wallet transaction % is not pending', p_wallet_transaction_id;
  END IF;

  UPDATE public.member_wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = wallet_tx.wallet_id;

  UPDATE public.member_wallet_transactions
  SET status = 'completed',
      reference_number = COALESCE(p_reference_number, reference_number),
      updated_at = now()
  WHERE id = p_wallet_transaction_id;
END;
$$;

INSERT INTO public.ai_knowledge_base (category, bot_scope, title, content, metadata)
VALUES
  (
    'public',
    'public',
    'About Turuturu Stars',
    'Turuturu Stars is a community based organization focused on member welfare, contributions, community engagement, meetings, and announcements. Public visitors can ask about joining, leadership, contacts, and general services.',
    '{"seed": true}'::jsonb
  ),
  (
    'membership',
    'public',
    'Joining Turuturu Stars',
    'To join Turuturu Stars, create an account on the website and complete the registration steps. If you already registered, use the WhatsApp number saved on your member profile to access member services.',
    '{"seed": true}'::jsonb
  ),
  (
    'payments',
    'member',
    'M-Pesa payment from WhatsApp',
    'Members can reply PAY on WhatsApp to receive an M-Pesa STK push for pending contributions. Members can also reply CONTRIBUTE 500 to initiate an STK push for a specific contribution amount. After payment succeeds, the system reconciles the payment and updates the contribution record.',
    '{"seed": true}'::jsonb
  ),
  (
    'wallet',
    'member',
    'Wallet top up from WhatsApp',
    'Members can reply WALLET to see their wallet balance or FUND 500 to receive an M-Pesa STK push and top up their wallet. Successful top-ups are recorded in the member wallet ledger.',
    '{"seed": true}'::jsonb
  ),
  (
    'meetings',
    'both',
    'Meeting information',
    'Members can ask about meetings on WhatsApp. The assistant should share the next scheduled meeting date, venue, and agenda when available.',
    '{"seed": true}'::jsonb
  ),
  (
    'announcements',
    'both',
    'Announcements',
    'Official announcements can be sent through WhatsApp using approved templates or customer-service replies within the active conversation window.',
    '{"seed": true}'::jsonb
  ),
  (
    'welfare',
    'member',
    'Welfare and kitty updates',
    'Members can ask for WELFARE or KITTY to see active welfare cases and contribution targets. Officials can send a WhatsApp announcement when a new kitty is added.',
    '{"seed": true}'::jsonb
  )
ON CONFLICT DO NOTHING;
