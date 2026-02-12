import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const MemberInteractionBanner = () => {
  const { isPendingApproval, isSuspended, isOfficial } = useAuth();

  if (isOfficial() || (!isPendingApproval && !isSuspended)) {
    return null;
  }

  const Icon = isSuspended ? ShieldAlert : Clock;
  const title = isSuspended ? 'Account suspended' : 'Approval pending';
  const message = isSuspended
    ? 'Your account is restricted. Contact admin for guidance.'
    : 'You can view your dashboard, but transactions and interactions are disabled until approval.';

  return (
    <div
      className={cn(
        'mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm',
        isSuspended
          ? 'border-red-300/70 bg-red-50 text-red-900'
          : 'border-amber-300/70 bg-amber-50 text-amber-900',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4" />
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p>{message}</p>
          {isPendingApproval && (
            <p className="inline-flex items-center gap-1 text-xs font-medium">
              <AlertCircle className="h-3 w-3" />
              You will be notified as soon as your application is approved or rejected.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberInteractionBanner;
