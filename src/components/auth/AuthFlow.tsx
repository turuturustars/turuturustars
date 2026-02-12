import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  const location = useLocation();
  const [params] = useSearchParams();

  const redirectState = location.state as {
    from?: { pathname?: string; search?: string; hash?: string };
  } | null;

  const fromPath = redirectState?.from?.pathname
    ? `${redirectState.from.pathname}${redirectState.from.search || ''}${redirectState.from.hash || ''}`
    : '/dashboard/home';

  const redirectPath =
    fromPath.startsWith('/auth') || fromPath.startsWith('/register') || fromPath === '/'
      ? '/dashboard/home'
      : fromPath;

  useEffect(() => {
    if (status === 'ready' || status === 'pending-approval' || status === 'suspended') {
      navigate(redirectPath, { replace: true });
    } else if (status === 'needs-profile') {
      navigate('/profile-setup', {
        replace: true,
        state: { from: { pathname: redirectPath } },
      });
    }
  }, [status, navigate, redirectPath]);

  const defaultMode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  return <AuthScreen defaultMode={defaultMode} redirectPath={redirectPath} />;
};

export default AuthFlow;
