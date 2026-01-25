import { Badge } from '@/components/ui/badge';

type Status = 'active' | 'pending' | 'dormant' | 'suspended' | 'paid' | 'missed' | 'closed' | 'cancelled' | string;

interface StatusBadgeProps {
  status: Status;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  icon?: React.ReactNode;
  className?: string;
}

const STATUS_COLORS: Record<Status, { bg: string; text: string; label?: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-800 dark:text-green-200' },
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-800 dark:text-yellow-200' },
  dormant: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-800 dark:text-red-200' },
  suspended: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200' },
  paid: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-800 dark:text-green-200' },
  missed: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-800 dark:text-red-200' },
  closed: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-800 dark:text-red-200' },
};

export function StatusBadge({ status, variant = 'default', icon, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const displayLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Badge 
      className={`${colors.bg} ${colors.text} border-0 ${icon ? 'flex items-center gap-1' : ''} ${className || ''}`} 
      variant={variant}
    >
      {icon}
      {displayLabel}
    </Badge>
  );
}
