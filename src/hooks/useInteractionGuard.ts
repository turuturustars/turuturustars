import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const PENDING_MESSAGE = 'Your account is pending approval. You can view data, but actions are disabled for now.';
const SUSPENDED_MESSAGE = 'Your account is suspended. Please contact admin for assistance.';

export function useInteractionGuard() {
  const { canInteract, isPendingApproval, isSuspended } = useAuth();
  const { toast } = useToast();

  const message = isSuspended ? SUSPENDED_MESSAGE : isPendingApproval ? PENDING_MESSAGE : null;

  const assertCanInteract = (actionLabel = 'complete this action') => {
    if (canInteract) return true;

    toast({
      title: 'Read-only access',
      description: message || `You cannot ${actionLabel} right now.`,
      variant: 'destructive',
    });

    return false;
  };

  return {
    canInteract,
    isPendingApproval,
    isSuspended,
    readOnlyMessage: message,
    assertCanInteract,
  };
}

export default useInteractionGuard;
