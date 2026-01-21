import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import Auth from '@/pages/Auth';
import PostAuthDetailsForm from '@/components/auth/PostAuthDetailsForm';

const AuthFlow = () => {
  const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'authenticated' | 'details-required'>('loading');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial auth state
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is authenticated, check if profile is complete
          setUser({ id: session.user.id, email: session.user.email });
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.full_name && profile.phone && profile.id_number) {
            // Profile is complete
            navigate('/dashboard', { replace: true });
          } else {
            // Profile is incomplete, need details
            setAuthState('details-required');
          }
        } else {
          // Not authenticated
          setAuthState('unauthenticated');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState('unauthenticated');
      }
    };

    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
        
        // Check profile completion
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.full_name && profile.phone && profile.id_number) {
          navigate('/dashboard', { replace: true });
        } else {
          setAuthState('details-required');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthState('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-background/80 backdrop-blur-sm rounded-full p-6 border-2 border-primary/20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'details-required' && user) {
    return <PostAuthDetailsForm user={user} />;
  }

  return <Auth />;
};

export default AuthFlow;
