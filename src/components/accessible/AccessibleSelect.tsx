/**
 * Phase 7: Accessible Select Component
 * Accessible dropdown select with ARIA support
 * 
 * File: src/components/accessible/AccessibleSelect.tsx
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useArrowKeyNavigation } from '@/lib/a11y';

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
 * Accessible select component with keyboard navigation
 */
export const AccessibleSelect = React.forwardRef<HTMLDivElement, AccessibleSelectProps>(
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
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const selectRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);
    const selectId = React.useId();
    const errorId = React.useId();
    const helperId = React.useId();

    // Get currently selected option label
    const selectedOption = options.find((opt) => opt.value === value);
    const selectedLabel = selectedOption?.label || 'Select an option';

    // Arrow key navigation
    useArrowKeyNavigation(options.length, (index) => {
      setHighlightedIndex(index);
      const disabledCount = options.slice(0, index).filter((opt) => opt.disabled).length;
      if (options[index]?.disabled) {
        // Skip disabled options
        return;
      }
    });

    // Handle keyboard events
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen) {
            const option = options[highlightedIndex];
            if (option && !option.disabled) {
              onChange?.(option.value);
              setIsOpen(false);
            }
          } else {
            setIsOpen(true);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) => {
              let next = prev + 1;
              while (next < options.length && options[next]?.disabled) {
                next++;
              }
              return next < options.length ? next : prev;
            });
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => {
              let next = prev - 1;
              while (next >= 0 && options[next]?.disabled) {
                next--;
              }
              return next >= 0 ? next : prev;
            });
          }
          break;

        case 'Home':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex(0);
          }
          break;

        case 'End':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex(options.length - 1);
          }
          break;
      }
    };

    // Handle click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
      if (isOpen && listboxRef.current) {
        const highlightedElement = listboxRef.current.children[highlightedIndex] as HTMLElement;
        highlightedElement?.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex, isOpen]);

    return (
      <div ref={ref} className={`space-y-2 ${className || ''}`}>
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
          {required && <span aria-label="required"> *</span>}
        </label>

        <div
          ref={selectRef}
          className="relative"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <button
            ref={buttonRef}
            id={selectId}
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            aria-label={ariaLabel || label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`
              w-full px-4 py-2 text-left rounded-lg border-2 transition-colors
              flex items-center justify-between gap-2
              ${
                error
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : isOpen
                    ? 'border-blue-500 bg-white dark:bg-gray-900'
                    : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
            `}
          >
            <span className={selectedOption ? '' : 'text-gray-500'}>
              {selectedLabel}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {isOpen && (
            <ul
              ref={listboxRef}
              role="listbox"
              className={`
                absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border-2 border-blue-500
                rounded-lg shadow-lg max-h-60 overflow-y-auto
              `}
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    if (!option.disabled) {
                      onChange?.(option.value);
                      setIsOpen(false);
                    }
                  }}
                  onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
                  className={`
                    px-4 py-2 cursor-pointer transition-colors
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${index === highlightedIndex ? 'bg-blue-100 dark:bg-blue-900/40' : ''}
                    ${option.value === value ? 'font-semibold bg-blue-50 dark:bg-blue-900/20' : ''}
                    hover:bg-gray-100 dark:hover:bg-gray-800
                  `}
                >
                  {option.label}
                  {option.value === value && (
                    <span className="ml-2" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

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
