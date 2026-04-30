ALTER TABLE public.mpesa_transactions
  ADD COLUMN kitty_id UUID REFERENCES public.kitties(id) ON DELETE SET NULL;

CREATE INDEX idx_mpesa_kitty ON public.mpesa_transactions(kitty_id) WHERE kitty_id IS NOT NULL;