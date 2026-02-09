import { usePageMeta } from '@/hooks/usePageMeta';
import AuthScreen from '@/features/auth/components/AuthScreen';

/**
 * Register Page - uses the new unified auth screen with the sign-up tab preselected.
 */
const Register = () => {
  usePageMeta({
    title: 'Join Turuturu Stars | Registration',
    description: 'Create your account to become a member of Turuturu Stars Community.',
    keywords: ['sign up', 'register', 'membership', 'Turuturu Stars'],
    canonicalUrl: 'https://turuturustars.co.ke/register',
    robots: 'index,follow',
  });

  return <AuthScreen defaultMode="signup" />;
};

export default Register;

