/**
 * Accessible Component Patterns - WCAG 2.1 AA Compliant
 */

import React from 'react';
import { Button } from '@/components/ui/button';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
}

export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      ariaLabel,
      ariaDescribedBy,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      isLoading = false,
      loadingText = 'Loading',
      disabled,
      children,
      size,
      asChild,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        size={size}
        asChild={asChild}
        {...props}
      >
        {isLoading ? (
          <>
            <span aria-hidden="true">⏳</span>
            <span className="sr-only">{loadingText}</span>
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
