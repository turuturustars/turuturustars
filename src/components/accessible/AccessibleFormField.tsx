/**
 * Phase 7: Accessible Form Field Component
 * WCAG 2.1 AA Compliant Form Field with Error States
 * 
 * File: src/components/accessible/AccessibleFormField.tsx
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useFormField } from '@/lib/a11y';

interface AccessibleFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Field label (visible to all users)
   */
  label: string;
  /**
   * Error message (if any)
   */
  error?: string;
  /**
   * Helper text below the field
   */
  helperText?: string;
  /**
   * Required field indicator
   */
  isRequired?: boolean;
  /**
   * Additional error message for screen readers
   */
  errorDescription?: string;
}

/**
 * Accessible form field component with proper ARIA labels and error handling
 */
export const AccessibleFormField = React.forwardRef<HTMLInputElement, AccessibleFormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      isRequired = false,
      errorDescription,
      disabled,
      ...props
    },
    ref
  ) => {
    const { descriptionId, inputProps, labelProps, errorProps } = useFormField(
      props.name || 'field',
      error
    );

    return (
      <div className="space-y-2">
        <Label {...labelProps}>
          {label}
          {isRequired && <span aria-label="required">*</span>}
        </Label>

        <Input
          ref={ref}
          {...inputProps}
          disabled={disabled}
          required={isRequired}
          {...props}
        />

        {error && (
          <div {...errorProps} className="text-sm text-red-600">
            {errorDescription || error}
          </div>
        )}

        {helperText && !error && (
          <p id={descriptionId} className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AccessibleFormField.displayName = 'AccessibleFormField';
