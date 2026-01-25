/**
 * Shared dashboard components
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Status badge component - reusable across pages
 */
export interface StatusBadgeProps {
  readonly status: string;
  readonly className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    // Member statuses
    active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    dormant: { label: 'Dormant', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    suspended: { label: 'Suspended', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },

    // Contribution statuses
    paid: { label: 'Paid', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    missed: { label: 'Missed', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },

    // Welfare statuses
    active_welfare: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
    resolved: { label: 'Resolved', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },

    // Priority levels
    low: { label: 'Low', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    normal: { label: 'Normal', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
    high: { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  };

  const config = statusConfig[status] || {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

/**
 * Priority badge component
 */
export function PriorityBadge({ priority }: { readonly priority: string }) {
  const priorityConfig: Record<string, { color: string; icon: string }> = {
    low: { color: 'text-blue-600 dark:text-blue-400', icon: '↓' },
    normal: { color: 'text-gray-600 dark:text-gray-400', icon: '→' },
    high: { color: 'text-orange-600 dark:text-orange-400', icon: '↑' },
    urgent: { color: 'text-red-600 dark:text-red-400', icon: '!!' },
  };

  const config = priorityConfig[priority] || priorityConfig.normal;

  return (
    <div className={`text-sm font-semibold ${config.color}`}>
      {config.icon} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </div>
  );
}

/**
 * Loading skeleton for lists
 */
export function ListSkeleton({ count = 5 }: { readonly count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={String(i)}
          className="h-12 bg-muted rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
export interface EmptyStateProps {
  readonly icon?: React.ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 opacity-50">{icon}</div>}
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * Stats card component
 */
export interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly icon?: React.ReactNode;
  readonly trend?: { readonly value: number; readonly direction: 'up' | 'down' };
  readonly color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
}: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs mt-2 font-medium',
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
            </p>
          )}
        </div>
        {icon && <div className={cn(colorClasses[color], 'p-2 rounded-lg')}>{icon}</div>}
      </div>
    </div>
  );
}
