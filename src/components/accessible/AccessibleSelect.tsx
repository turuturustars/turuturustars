/**
 * Phase 7: Accessible Select Component
 * Accessible dropdown select using native HTML elements
 * 
 * File: src/components/accessible/AccessibleSelect.tsx
 */

import React from 'react';

export interface AccessibleSelectProps {
  /**
   * Label for the select
   */
  label: string;
  /**
   * Select options
   */
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /**
   * Current value
   */
  value?: string;
  /**
   * Callback when value changes
   */
  onChange?: (value: string) => void;
  /**
   * Is required field
   */
  required?: boolean;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Error message
   */
  error?: string;
  /**
   * Helper text
   */
  helperText?: string;
  /**
   * ARIA label override
   */
  ariaLabel?: string;
  /**
   * Class name
   */
  className?: string;
}

/**
 * Accessible select component using native HTML elements
 * Provides full keyboard navigation and accessibility out of the box
 */
export const AccessibleSelect = React.forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  (
    {
      label,
      options,
      value,
      onChange,
      required = false,
      disabled = false,
      error,
      helperText,
      ariaLabel,
      className,
    },
    ref
  ) => {
    const selectId = React.useId();
    const errorId = React.useId();
    const helperId = React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    const describedBy = error ? errorId : (helperText ? helperId : undefined);

    return (
      <div className={`space-y-2 ${className || ''}`}>
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
          {required && <span aria-label="required"> *</span>}
        </label>

        <select
          ref={ref}
          id={selectId}
          value={value || ''}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel || label}
          aria-describedby={describedBy}
          className={`
            w-full px-4 py-2 rounded-lg border-2 transition-colors appearance-none
            ${
              error
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
            dark:text-white dark:placeholder-gray-400
          `}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={helperId}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';
