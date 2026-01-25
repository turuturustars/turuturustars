/**
 * Phase 7: Accessible Live Region Status Component
 * For dynamic content updates and status announcements
 * 
 * File: src/components/accessible/AccessibleStatus.tsx
 */

import React, { useEffect } from 'react';
import { useLiveRegion } from '@/lib/a11y';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type StatusType = 'success' | 'error' | 'info' | 'warning';

export interface AccessibleStatusProps {
  /**
   * The message to display and announce
   */
  message: string;
  /**
   * Type of status message
   */
  type?: StatusType;
  /**
   * Whether to show the visual indicator
   */
  isVisible?: boolean;
  /**
   * Politeness level for announcements
   */
  politeness?: 'polite' | 'assertive';
  /**
   * Icon to display (if any)
   */
  showIcon?: boolean;
  /**
   * CSS class name for styling
   */
  className?: string;
  /**
   * Duration to auto-hide (in ms), 0 = never hide
   */
  autoDismissDuration?: number;
  /**
   * Callback when auto-dismiss occurs
   */
  onDismiss?: () => void;
}

const statusConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-200',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

interface UseLiveRegionReturn {
  announceRef: React.RefObject<HTMLDivElement>;
  announce: (message: string) => void;
}

/**
 * Accessible status component with live region announcements
 * Auto-announces changes to screen readers
 */
export const AccessibleStatus = React.forwardRef<HTMLDivElement, AccessibleStatusProps>(
  (
    {
      message,
      type = 'info',
      isVisible = true,
      politeness = 'polite',
      showIcon = true,
      className,
      autoDismissDuration = 0,
      onDismiss,
    },
    ref
  ) => {
    const { announceRef, announce } = useLiveRegion(politeness) as UseLiveRegionReturn;
    const config = statusConfig[type];
    const IconComponent = config.icon;

    // Announce changes to screen readers
    useEffect(() => {
      if (isVisible && message) {
        announce(message);
      }
    }, [message, isVisible, announce]);

    // Auto-dismiss functionality
    useEffect(() => {
      if (!isVisible || !autoDismissDuration || autoDismissDuration <= 0) {
        return;
      }

      const timer = setTimeout(() => {
        onDismiss?.();
      }, autoDismissDuration);

      return () => clearTimeout(timer);
    }, [isVisible, autoDismissDuration, onDismiss]);

    if (!isVisible) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-live={politeness}
        aria-atomic="true"
        className={`
          flex items-start gap-3 p-4 rounded-lg border
          ${config.bgColor} ${config.borderColor} ${config.textColor}
          ${className}
        `}
      >
        {showIcon && (
          <IconComponent
            className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`}
            aria-hidden="true"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{message}</p>
        </div>
        {/* Live region announcement container - hidden from view */}
        <div ref={announceRef} className="sr-only" role="status" aria-live={politeness} />
      </div>
    );
  }
);

AccessibleStatus.displayName = 'AccessibleStatus';

/**
 * Hook for managing status messages
 */
export function useStatus() {
  const [status, setStatus] = React.useState<{
    message: string;
    type: StatusType;
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const show = (message: string, type: StatusType = 'info', duration?: number) => {
    setStatus({ message, type, isVisible: true });

    if (duration) {
      setTimeout(() => {
        setStatus((prev) => ({ ...prev, isVisible: false }));
      }, duration);
    }
  };

  const hide = () => {
    setStatus((prev) => ({ ...prev, isVisible: false }));
  };

  const showSuccess = (message: string, duration = 3000) => show(message, 'success', duration);
  const showError = (message: string, duration = 5000) => show(message, 'error', duration);
  const showWarning = (message: string, duration = 4000) => show(message, 'warning', duration);
  const showInfo = (message: string, duration = 3000) => show(message, 'info', duration);

  return {
    status,
    show,
    hide,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
