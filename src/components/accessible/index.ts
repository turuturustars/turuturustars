/**
 * Phase 7: Accessible Components Index
 * Central export point for all accessibility components
 * 
 * File: src/components/accessible/index.ts
 */

// Core accessible components
export { AccessibleButton } from './AccessibleButton';
export type { AccessibleButtonProps } from './AccessibleButton';

export { AccessibleFormField } from './AccessibleFormField';
export type { AccessibleFormFieldProps } from './AccessibleFormField';

export { AccessibleDialog } from './AccessibleDialog';
export type { AccessibleDialogProps } from './AccessibleDialog';

export { AccessibleTable } from './AccessibleTable';
export type { AccessibleTableProps } from './AccessibleTable';

export { AccessibleStatus, useStatus } from './AccessibleStatus';
export type { AccessibleStatusProps } from './AccessibleStatus';

export { AccessibleSelect } from './AccessibleSelect';
export type { AccessibleSelectProps } from './AccessibleSelect';

// List components
export {
  ListItem,
  UnorderedList,
  OrderedList,
  DescriptionList,
  NavigationList,
} from './AccessibleList';
export type {
  ListItemProps,
  AccessibleListProps,
  DescriptionListProps,
  NavigationListProps,
} from './AccessibleList';

// Accessibility utilities
export {
  useFocusTrap,
  getFocusableElements,
  useFocusOnRouteChange,
  useAriaId,
  announceToScreenReader,
  useAriaAnnounce,
  getContrastRatio,
  meetsWCAGAA,
  useArrowKeyNavigation,
  SkipNavLink,
  validateHeadingHierarchy,
  useFormField,
  useLiveRegion,
  runA11yAudit,
} from '@/lib/a11y';
