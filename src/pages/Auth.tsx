import AuthScreen from '@/features/auth/components/AuthScreen';
import { usePageMeta } from '@/hooks/usePageMeta';

const AuthPage = () => {
  usePageMeta({
    title: 'Sign In | Turuturu Stars',
    description: 'Access your account securely.',
    canonicalUrl: 'https://turuturustars.co.ke/auth',
    robots: 'index,follow',
  });

  return <AuthScreen defaultMode="signin" />;
};

export default AuthPage;
