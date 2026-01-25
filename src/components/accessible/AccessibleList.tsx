/**
 * Phase 7: Accessible List Components
 * Semantic HTML lists with accessibility
 * 
 * File: src/components/accessible/AccessibleList.tsx
 */

import React from 'react';

export interface ListItemProps {
  /**
   * Item content
   */
  children: React.ReactNode;
  /**
   * ARIA label for complex items
   */
  ariaLabel?: string;
  /**
   * Optional className
   */
  className?: string;
  /**
   * Optional action to render
   */
  action?: React.ReactNode;
}

export interface AccessibleListProps {
  /**
   * List items
   */
  items: (React.ReactNode | ListItemProps)[];
  /**
   * ARIA label for the list
   */
  ariaLabel?: string;
  /**
   * Optional className
   */
  className?: string;
  /**
   * Whether to render as simple list or complex
   */
  complex?: boolean;
}

/**
 * Accessible unordered list item
 */
export const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ children, ariaLabel, className, action }, ref) => (
    <li ref={ref} aria-label={ariaLabel} className={className}>
      <div className="flex items-center justify-between gap-4">
        <span className="flex-1">{children}</span>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </li>
  )
);

ListItem.displayName = 'ListItem';

/**
 * Shared renderItem function for list components
 */
const renderItem = (item: React.ReactNode | ListItemProps, index: number) => {
  if (React.isValidElement(item)) {
    return item;
  }

  if (typeof item === 'object' && item !== null && 'children' in item) {
    const props = item as ListItemProps;
    return (
      <ListItem
        key={props.ariaLabel || index}
        ariaLabel={props.ariaLabel}
        className={props.className}
        action={props.action}
      >
        {props.children}
      </ListItem>
    );
  }

  return (
    <ListItem key={index}>
      {item}
    </ListItem>
  );
};

/**
 * Accessible unordered list
 */
export const UnorderedList = React.forwardRef<HTMLUListElement, AccessibleListProps>(
  ({ items, ariaLabel, className, complex }, ref) => (
    <ul
      ref={ref}
      aria-label={ariaLabel}
      className={`list-disc list-inside space-y-2 ${className || ''}`}
      role={complex ? 'list' : undefined}
    >
      {items.map((item, index) => renderItem(item, index))}
    </ul>
  )
);

UnorderedList.displayName = 'UnorderedList';

/**
 * Accessible ordered list
 */
export const OrderedList = React.forwardRef<HTMLOListElement, AccessibleListProps>(
  ({ items, ariaLabel, className, complex }, ref) => (
    <ol
      ref={ref}
      aria-label={ariaLabel}
      className={`list-decimal list-inside space-y-2 ${className || ''}`}
      role={complex ? 'list' : undefined}
    >
      {items.map((item, index) => renderItem(item, index))}
    </ol>
  )
);

OrderedList.displayName = 'OrderedList';

/**
 * Accessible description list (for term-definition pairs)
 */
export interface DescriptionListProps {
  /**
   * List of term-definition pairs
   */
  items: Array<{ term: string; description: React.ReactNode }>;
  /**
   * Optional className
   */
  className?: string;
}

export const DescriptionList = React.forwardRef<HTMLDListElement, DescriptionListProps>(
  ({ items, className }, ref) => (
    <dl ref={ref} className={`space-y-4 ${className || ''}`}>
      {items.map((item) => (
        <div key={item.term} className="flex flex-col gap-1">
          <dt className="font-semibold text-gray-900 dark:text-gray-100">
            {item.term}
          </dt>
          <dd className="ml-4 text-gray-700 dark:text-gray-300">
            {item.description}
          </dd>
        </div>
      ))}
    </dl>
  )
);

DescriptionList.displayName = 'DescriptionList';

/**
 * Accessible navigation list for menu items
 */
export interface NavigationListProps {
  /**
   * Navigation items
   */
  items: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
    ariaLabel?: string;
  }>;
  /**
   * Optional className
   */
  className?: string;
  /**
   * Optional ARIA label
   */
  ariaLabel?: string;
}

export const NavigationList = React.forwardRef<HTMLNavElement, NavigationListProps>(
  ({ items, className, ariaLabel }, ref) => (
    <nav ref={ref} aria-label={ariaLabel || 'Navigation'}>
      <ul className={`space-y-1 ${className || ''}`}>
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <a
                href={item.href}
                aria-label={item.ariaLabel || item.label}
                aria-current={item.isActive ? 'page' : undefined}
                className={`
                  block px-4 py-2 rounded-lg transition-colors
                  ${item.isActive
                    ? 'bg-blue-100 text-blue-900 font-semibold dark:bg-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                {item.label}
              </a>
            ) : (
              <button
                onClick={item.onClick}
                aria-label={item.ariaLabel || item.label}
                aria-current={item.isActive ? 'page' : undefined}
                className={`
                  w-full text-left px-4 py-2 rounded-lg transition-colors
                  ${item.isActive
                    ? 'bg-blue-100 text-blue-900 font-semibold dark:bg-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
);

NavigationList.displayName = 'NavigationList';
