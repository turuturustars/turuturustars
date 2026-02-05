 import { usePageMeta } from '@/hooks/usePageMeta';
 import RegistrationFlow from '@/components/auth/RegistrationFlow';
 
 /**
  * Register Page - Streamlined Step-by-Step Registration
  */
 const Register = () => {
   usePageMeta({
     title: 'Join Turuturu Stars | Registration',
     description: 'Create your account to become a member of Turuturu Stars Community.',
     keywords: ['sign up', 'register', 'membership', 'Turuturu Stars'],
     canonicalUrl: 'https://turuturustars.co.ke/register',
     robots: 'index,follow',
   });
 
   return <RegistrationFlow />;
 };
 
 export default Register;

