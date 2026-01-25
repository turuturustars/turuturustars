/**
 * Phase 7: Accessible Dialog/Modal Component
 * WCAG 2.1 AA Compliant Modal with Focus Management
 * 
 * File: src/components/accessible/AccessibleDialog.tsx
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useFocusTrap } from '@/lib/a11y';

interface AccessibleDialogProps {
  /**
   * Dialog title (announced to screen readers)
   */
  title: string;
  /**
   * Dialog description (helps explain purpose)
   */
  description?: string;
  /**
   * Whether dialog is open
   */
  isOpen: boolean;
  /**
   * Callback when dialog should close
   */
  onClose: () => void;
  /**
   * Dialog content
   */
  children: React.ReactNode;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Accessible dialog component with focus trap and proper ARIA support
 */
export const AccessibleDialog = React.forwardRef<HTMLDivElement, AccessibleDialogProps>(
  ({ title, description, isOpen, onClose, children, size = 'md' }, ref) => {
    const focusRef = useFocusTrap(isOpen);

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          ref={ref}
          className={sizeClasses[size]}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={description ? 'dialog-description' : undefined}
        >
          <div ref={focusRef}>
            <DialogHeader>
              <DialogTitle id="dialog-title">{title}</DialogTitle>
              {description && (
                <DialogDescription id="dialog-description">{description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="mt-4">{children}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

AccessibleDialog.displayName = 'AccessibleDialog';
