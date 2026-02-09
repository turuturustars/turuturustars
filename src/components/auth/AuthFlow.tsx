import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthScreen from '@/features/auth/components/AuthScreen';
import { useAuth } from '@/hooks/useAuth';

/**
 * AuthFlow now delegates to the new AuthProvider-driven state machine.
 * It routes authenticated users to the dashboard or profile setup and
 * shows the unified AuthScreen for everyone else.
 */
const AuthFlow = () => {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (status === 'ready') {
      navigate('/dashboard', { replace: true });
    } else if (status === 'needs-profile') {
      navigate('/profile-setup', { replace: true });
    }
  }, [status, navigate]);

  const defaultMode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  return <AuthScreen defaultMode={defaultMode} />;
};

export default AuthFlow;
