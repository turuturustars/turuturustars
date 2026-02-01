/**
 * Phase 7: Accessibility Utilities & Components
 * WCAG 2.1 AA Compliance Helpers
 * 
 * File: src/lib/a11y.tsx
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

// ============================================================================
// Focus Management Utilities
// ============================================================================

/**
 * Manages focus trap for modals and dialogs
 * Keeps focus within the modal and returns to trigger element on close
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before modal opened
    triggerRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      // Get all focusable elements within the container
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const { activeElement } = document;

      // Trap focus at boundaries
      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    // Focus first element on open
    const containerElement = containerRef.current;
    if (containerElement) {
      const focusableElements = getFocusableElements(containerElement);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Return focus to trigger element
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen]);

  return containerRef;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll(focusableSelectors)).filter((element) => {
    const style = globalThis.getComputedStyle(element as HTMLElement);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }) as HTMLElement[];
}

/**
 * Hook to manage focus on route changes
 */
export function useFocusOnRouteChange() {
  useEffect(() => {
    // Set focus to main content area on route change
    const main = document.querySelector('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
    }
  }, []);
}

// ============================================================================
// ARIA Utilities
// ============================================================================

/**
 * Generate unique IDs for ARIA attributes
 */
export function useAriaId(prefix = 'aria'): string {
  const idRef = useRef<string>('');

  if (!idRef.current) {
    idRef.current = `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return idRef.current;
}

/**
 * Announce screen reader messages
 */
export function announceToScreenReader(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', politeness);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    announcement.remove();
  }, 1000);
}

/**
 * Hook for managing aria-live announcements
 */
export function useAriaAnnounce() {
  const announce = useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, politeness);
    },
    []
  );

  return announce;
}

// ============================================================================
// Color Contrast Utilities
// ============================================================================

/**
 * Calculate relative luminance of a color (for contrast ratio calculation)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(x => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * Returns ratio (4.5:1 for AA compliance on normal text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

/**
 * Check if colors meet WCAG AA contrast requirements
 */
export function meetsWCAGAA(color1: string, color2: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(color1, color2);
  // AA: 4.5:1 for normal text, 3:1 for large text
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// ============================================================================
// Keyboard Navigation Utilities
// ============================================================================

/**
 * Hook for handling arrow key navigation in lists/menus
 */
export function useArrowKeyNavigation(
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const updateFocusedIndex = useCallback(
    (newIndex: number) => {
      const normalized = ((newIndex % itemCount) + itemCount) % itemCount;
      setFocusedIndex(normalized);
      if (onSelect) {
        onSelect(normalized);
      }
    },
    [itemCount, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          updateFocusedIndex(focusedIndex + 1);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          updateFocusedIndex(focusedIndex - 1);
          break;
        case 'Home':
          e.preventDefault();
          updateFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          updateFocusedIndex(itemCount - 1);
          break;
      }
    },
    [focusedIndex, itemCount, updateFocusedIndex]
  );

  return {
    focusedIndex,
    setFocusedIndex: updateFocusedIndex,
    handleKeyDown,
  };
}

// ============================================================================
// Skip Navigation
// ============================================================================

/**
 * Component wrapper to add skip navigation link
 */
export function SkipNavLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-blue-600 focus:text-white focus:p-3 focus:outline-2 focus:outline-offset-2"
    >
      Skip to main content
    </a>
  );
}

// ============================================================================
// Heading Structure Utilities
// ============================================================================

/**
 * Validate heading hierarchy (h1 should be first, no gaps in levels)
 */
export function validateHeadingHierarchy(): string[] {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const errors: string[] = [];
  let lastLevel = 0;

  let h1Count = 0;

  for (const heading of headings) {
    const level = Number.parseInt(heading.tagName[1]);

    if (level === 1) {
      h1Count++;
    }

    // Check for multiple h1s
    if (level === 1 && h1Count > 1) {
      errors.push('Multiple h1 elements found - only one per page allowed');
    }

    // Check for gaps in heading hierarchy
    if (lastLevel > 0 && level > lastLevel + 1) {
      errors.push(`Heading hierarchy gap: jumped from h${lastLevel} to h${level}`);
    }

    lastLevel = level;
  }

  if (h1Count === 0) {
    errors.push('No h1 element found - every page should have one');
  }

  return errors;
}

// ============================================================================
// Screen Reader Only Content
// ============================================================================

/**
 * Utility styles for screen reader only content
 */
export const srOnlyStyles = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
} as const;

// ============================================================================
// Form Accessibility Utilities
// ============================================================================

/**
 * Hook for managing form field accessibility
 */
export function useFormField(name: string, error?: string) {
  const inputId = useAriaId(`input-${name}`);
  const errorId = useAriaId(`error-${name}`);
  const descriptionId = useAriaId(`desc-${name}`);

  const inputProps = {
    id: inputId,
    'aria-invalid': !!error,
    'aria-describedby': error ? errorId : descriptionId,
  };

  const errorProps = {
    id: errorId,
    role: 'alert' as const,
    'aria-live': 'polite' as const,
  };

  const labelProps = {
    htmlFor: inputId,
  };

  return {
    inputId,
    errorId,
    descriptionId,
    inputProps,
    errorProps,
    labelProps,
  };
}

// ============================================================================
// Live Region Utilities
// ============================================================================

/**
 * Hook for creating live regions for dynamic content updates
 */
export function useLiveRegion(politeness: 'polite' | 'assertive' = 'polite') {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (regionRef.current) {
      regionRef.current.setAttribute('role', 'status');
      regionRef.current.setAttribute('aria-live', politeness);
      regionRef.current.setAttribute('aria-atomic', 'true');
    }
  }, [politeness]);

  const announce = useCallback(
    (message: string) => {
      if (regionRef.current) {
        regionRef.current.textContent = message;
      }
    },
    []
  );

  return {
    announceRef: regionRef,
    announce,
  };
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Run accessibility audit in development
 */
export function runA11yAudit() {
  if (process.env.NODE_ENV !== 'development') return;

  const errors = validateHeadingHierarchy();

  if (errors.length > 0) {
    console.warn('[Accessibility Audit]:', errors);
  }

  // Check for images without alt text
  const images = document.querySelectorAll('img:not([alt])');
  if (images.length > 0) {
    console.warn(`[Accessibility Audit]: ${images.length} images missing alt text`);
  }

  // Check for buttons without accessible labels
  const buttons = document.querySelectorAll('button');
  const unlabeledButtons = Array.from(buttons).filter(btn => {
    const ariaLabel = btn.getAttribute('aria-label');
    const textContent = btn.textContent?.trim();
    return !ariaLabel && !textContent;
  });

  if (unlabeledButtons.length > 0) {
    console.warn(
      `[Accessibility Audit]: ${unlabeledButtons.length} buttons may lack accessible labels`
    );
  }
}
