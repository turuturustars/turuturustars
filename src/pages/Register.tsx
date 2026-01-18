import { useEffect } from 'react';

const Register = () => {
  useEffect(() => {
    // Redirect to the auth page
    globalThis.location.href = 'https://turuturustars.co.ke/auth';
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Redirecting to registration...</p>
      </div>
    </div>
  );
};

export default Register;
