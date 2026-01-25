/**
 * Bulk Actions Toolbar Component
 * Displays when items are selected
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  X,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: boolean;
  requiresSelection?: boolean;
}

export interface BulkActionsToolbarProps {
  readonly selectedCount: number;
  readonly totalCount: number;
  readonly isAllSelected: boolean;
  readonly onSelectAll: () => void;
  readonly onClearSelection: () => void;
  readonly actions: readonly BulkAction[];
  readonly showQuickActions?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
  actions,
  showQuickActions = true,
}: BulkActionsToolbarProps) {
  // Separate quick actions from menu actions
  const quickActions = useMemo(() => {
    return actions.filter((a) => a.label.length <= 15).slice(0, 3);
  }, [actions]);

  const menuActions = useMemo(() => {
    return actions.slice(quickActions.length);
  }, [actions, quickActions.length]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Card className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
      <div className="flex items-center justify-between p-4 gap-4">
        {/* Left Section: Selection Info and Checkbox */}
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isAllSelected}
            onChange={onSelectAll}
            aria-label="Select all items"
          />
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
            {selectedCount !== totalCount && ` of ${totalCount}`}
          </span>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick action buttons */}
          {showQuickActions &&
            quickActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                disabled={action.disabled || (action.requiresSelection && selectedCount === 0)}
                className="gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}

          {/* More actions menu */}
          {menuActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuActions.map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.onClick}
                    disabled={action.disabled || (action.requiresSelection && selectedCount === 0)}
                    className={action.variant === 'destructive' ? 'text-red-600' : ''}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Clear selection button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Checkbox cell for table rows
 */
export function BulkActionCheckbox({
  checked,
  onChange,
  disabled = false,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}) {
  return (
    <Checkbox
      checked={checked}
      onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      disabled={disabled}
      aria-label="Select item"
    />
  );
}
