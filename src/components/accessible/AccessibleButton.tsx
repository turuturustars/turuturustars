/**
 * Phase 7: Accessible Component Patterns
 * WCAG 2.1 AA Compliant Component Wrappers
 * 
 * File: src/components/accessible/AccessibleButton.tsx
 */

import React from 'react';
import { Button } from '@/components/ui/button';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Label for screen readers (required for icon-only buttons)
   */
  ariaLabel?: string;
  /**
   * Describes the button purpose (for help text)
   */
  ariaDescribedBy?: string;
  /**
   * Whether the button is in a pressed/active state
   */
  ariaPressed?: boolean;
  /**
   * For toggling content visibility
   */
  ariaExpanded?: boolean;
  /**
   * ID of element being controlled
   */
  ariaControls?: string;
  /**
   * Custom variant for button styling
   */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  /**
   * Whether button is loading (disables interaction)
   */
  isLoading?: boolean;
  /**
   * Loading indicator text for screen readers
   */
  loadingText?: string;
  children?: React.ReactNode;
}

/**
 * Accessible button component with proper ARIA support
 */
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
