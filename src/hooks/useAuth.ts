import { useMemo } from 'react';
import type { ProfileRow } from '@/features/auth/authApi';
import { useAuthContext } from '@/features/auth/AuthProvider';

export const useAuth = () => {
  const ctx = useAuthContext();

  const hasRole = (role: string) => ctx.roles.some((r) => r === role || r === 'admin');
  const isOfficial = () =>
    ctx.roles.some((r) =>
      [
        'admin',
        'treasurer',
        'secretary',
        'chairperson',
        'vice_chairman',
        'vice_secretary',
        'organizing_secretary',
        'committee_member',
        'patron',
        'coordinator',
      ].includes(r)
    );

  return useMemo(() => {
    const isLoading = ctx.status === 'checking';
    return {
      ...ctx,
      isLoading,
      profile: ctx.profile as ProfileRow | null,
      hasRole,
      isOfficial,
    };
  }, [ctx]);
};

export default useAuth;
