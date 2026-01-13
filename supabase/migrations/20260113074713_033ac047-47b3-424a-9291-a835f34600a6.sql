-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for contributions table
ALTER TABLE public.contributions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;

-- Enable realtime for announcements table
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;