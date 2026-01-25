/**
 * Accessibility utilities - ARIA labels, keyboard navigation, screen reader support
 */

/**
 * ARIA attributes for common UI patterns
 */
export const ariaPatterns = {
  /**
   * Modal dialog attributes
   */
  modal: {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': 'modal-title',
    'aria-describedby': 'modal-description',
  },

  /**
   * Alert messages
   */
  alert: {
    role: 'alert',
    'aria-live': 'polite' as const,
  },

  /**
   * Error message
   */
  error: {
    role: 'alert',
    'aria-live': 'assertive' as const,
    'aria-atomic': true,
  },

  /**
   * Loading spinner
   */
  loading: {
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-busy': true,
  },

  /**
   * Form group
   */
  formGroup: {
    role: 'group',
  },

  /**
   * List
   */
  list: {
    role: 'list',
  },

  /**
   * List item
   */
  listItem: {
    role: 'listitem',
  },

  /**
   * Progress bar
   */
  progressBar: {
    role: 'progressbar',
  },

  /**
   * Tab navigation
   */
  tablist: {
    role: 'tablist',
  },

  /**
   * Menu
   */
  menu: {
    role: 'menu',
  },

  /**
   * Menu item
   */
  menuItem: {
    role: 'menuitem',
  },
};

/**
 * Generate ARIA label for common form fields
 */
export function getFieldAriaLabel(fieldName: string, required?: boolean): string {
  return `${fieldName}${required ? ' (required)' : ''}`;
}

/**
 * Generate ARIA label for buttons
 */
export function getButtonAriaLabel(
  buttonText: string,
  action?: string,
  context?: string
): string {
  const parts = [buttonText];
  if (action) parts.push(action);
  if (context) parts.push(`for ${context}`);
  return parts.join(' - ');
}

/**
 * Generate ARIA error message ID
 */
export function getErrorId(fieldName: string): string {
  return `${fieldName}-error`;
}

/**
 * Generate ARIA help text ID
 */
export function getHelpTextId(fieldName: string): string {
  return `${fieldName}-help`;
}

/**
 * Generate ARIA description ID
 */
export function getDescriptionId(element: string): string {
  return `${element}-description`;
}

/**
 * Combine multiple ARIA IDs
 */
export function combineAriaDescribedBy(ids: (string | undefined)[]): string {
  return ids.filter(Boolean).join(' ');
}

/**
 * Keyboard shortcut helper
 */
export const keyboardShortcuts = {
  /**
   * Escape key - close modals, cancel operations
   */
  isEscapeKey: (e: KeyboardEvent): boolean => e.key === 'Escape',

  /**
   * Enter key - submit forms, confirm actions
   */
  isEnterKey: (e: KeyboardEvent): boolean => e.key === 'Enter',

  /**
   * Space key - toggle checkboxes, activate buttons
   */
  isSpaceKey: (e: KeyboardEvent): boolean => e.key === ' ',

  /**
   * Tab key - navigate between focusable elements
   */
  isTabKey: (e: KeyboardEvent): boolean => e.key === 'Tab',

  /**
   * Arrow Up - navigate up in lists/menus
   */
  isArrowUp: (e: KeyboardEvent): boolean => e.key === 'ArrowUp',

  /**
   * Arrow Down - navigate down in lists/menus
   */
  isArrowDown: (e: KeyboardEvent): boolean => e.key === 'ArrowDown',

  /**
   * Arrow Left - navigate left in tabs/carousels
   */
  isArrowLeft: (e: KeyboardEvent): boolean => e.key === 'ArrowLeft',

  /**
   * Arrow Right - navigate right in tabs/carousels
   */
  isArrowRight: (e: KeyboardEvent): boolean => e.key === 'ArrowRight',

  /**
   * Home key
   */
  isHomeKey: (e: KeyboardEvent): boolean => e.key === 'Home',

  /**
   * End key
   */
  isEndKey: (e: KeyboardEvent): boolean => e.key === 'End',
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Focus element by ID
   */
  focusElement: (elementId: string): void => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  },

  /**
   * Focus first focusable element in container
   */
  focusFirst: (container: HTMLElement): void => {
    const focusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  },

  /**
   * Focus last focusable element in container
   */
  focusLast: (container: HTMLElement): void => {
    const focusables = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length > 0) {
      focusables[focusables.length - 1].focus();
    }
  },

  /**
   * Trap focus within modal
   */
  trapFocus: (event: KeyboardEvent, container: HTMLElement): void => {
    if (!keyboardShortcuts.isTabKey(event)) return;

    const focusables = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusables.length === 0) return;

    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      if (activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  },

  /**
   * Announce message to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => announcement.remove(), 1000);
  },

  /**
   * Create screen reader only element
   */
  createSrOnly: (text: string): HTMLElement => {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  },
};

/**
 * Form field ARIA attributes builder
 */
export function createFieldAriaProps(options: {
  fieldName: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  description?: string;
  disabled?: boolean;
}) {
  const ariaProps: Record<string, any> = {
    'aria-label': getFieldAriaLabel(options.fieldName, options.required),
    'aria-required': options.required,
    'aria-disabled': options.disabled,
  };

  const describedByIds = [];

  if (options.error) {
    describedByIds.push(getErrorId(options.fieldName));
    ariaProps['aria-invalid'] = true;
  }

  if (options.helpText) {
    describedByIds.push(getHelpTextId(options.fieldName));
  }

  if (options.description) {
    describedByIds.push(getDescriptionId(options.fieldName));
  }

  if (describedByIds.length > 0) {
    ariaProps['aria-describedby'] = describedByIds.join(' ');
  }

  return ariaProps;
}

/**
 * Button ARIA attributes builder
 */
export function createButtonAriaProps(options: {
  text: string;
  action?: string;
  context?: string;
  pressed?: boolean;
  expanded?: boolean;
  hasPopup?: boolean;
  disabled?: boolean;
}) {
  return {
    'aria-label': getButtonAriaLabel(options.text, options.action, options.context),
    ...(options.pressed !== undefined && { 'aria-pressed': options.pressed }),
    ...(options.expanded !== undefined && { 'aria-expanded': options.expanded }),
    ...(options.hasPopup && { 'aria-haspopup': true }),
    ...(options.disabled && { 'aria-disabled': true }),
  };
}

/**
 * Selectable list item ARIA attributes
 */
export function createListItemAriaProps(options: {
  selected?: boolean;
  disabled?: boolean;
  index?: number;
  total?: number;
}) {
  return {
    ...(options.selected !== undefined && { 'aria-selected': options.selected }),
    ...(options.disabled && { 'aria-disabled': true }),
    ...(options.index !== undefined && options.total && {
      'aria-posinset': options.index + 1,
      'aria-setsize': options.total,
    }),
  };
}

/**
 * Loading indicator ARIA attributes
 */
export function getLoadingAriaProps() {
  return {
    ...ariaPatterns.loading,
  };
}

/**
 * Error message ARIA attributes
 */
export function getErrorAriaProps(fieldName: string) {
  return {
    ...ariaPatterns.error,
    id: getErrorId(fieldName),
  };
}

/**
 * Success message ARIA attributes
 */
export function getSuccessAriaProps() {
  return {
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-atomic': true,
  };
}

/**
 * Skip link for keyboard navigation
 */
export const SkipLinks = {
  main: 'Skip to main content',
  navigation: 'Skip to navigation',
  footer: 'Skip to footer',
};

/**
 * Color contrast checker (basic)
 */
export function hasGoodContrast(hexColor1: string, hexColor2: string): boolean {
  const getLuminance = (hex: string): number => {
    const rgb = Number.parseInt(hex.slice(1), 16);
    const r = Math.trunc(rgb / 65536) & 0xff;
    const g = Math.trunc(rgb / 256) & 0xff;
    const b = rgb & 0xff;

    // Relative luminance formula
    const luminance = (value: number) => {
      const srgb = value / 255;
      return srgb <= 0.03928
        ? srgb / 12.92
        : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
  };

  const l1 = getLuminance(hexColor1);
  const l2 = getLuminance(hexColor2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const contrast = (lighter + 0.05) / (darker + 0.05);

  // WCAG AA requires 4.5:1 for normal text
  return contrast >= 4.5;
}
