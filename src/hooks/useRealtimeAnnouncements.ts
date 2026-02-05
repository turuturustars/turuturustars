import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string | null;
}

export const useRealtimeAnnouncements = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial announcements
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, priority, published, published_at, created_at, created_by')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching announcements:', error);
      } else if (data) {
        setAnnouncements(data as Announcement[]);
      }
      setIsLoading(false);
    };

    fetchAnnouncements();

    // Subscribe to real-time announcements
    const channel = supabase
      .channel('public-announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          if (newAnnouncement.published) {
            setAnnouncements(prev => {
              if (prev.some(a => a.id === newAnnouncement.id)) {
                return prev;
              }
              return [newAnnouncement, ...prev];
            });

            toast({
              title: '📢 New Announcement',
              description: newAnnouncement.title,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          const updatedAnnouncement = payload.new as Announcement;
          
          setAnnouncements(prev => {
            const exists = prev.find(a => a.id === updatedAnnouncement.id);
            
            if (updatedAnnouncement.published) {
              if (exists) {
                return prev.map(a => a.id === updatedAnnouncement.id ? updatedAnnouncement : a);
              } else {
                return [updatedAnnouncement, ...prev];
              }
            } else {
              return prev.filter(a => a.id !== updatedAnnouncement.id);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            setAnnouncements(prev => prev.filter(a => a.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return {
    announcements,
    isLoading,
  };
};
