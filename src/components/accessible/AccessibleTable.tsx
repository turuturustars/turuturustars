/**
 * Phase 7: Accessible Table Component
 * WCAG 2.1 AA Compliant Data Table
 * 
 * File: src/components/accessible/AccessibleTable.tsx
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TableColumn {
  id: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface AccessibleTableProps {
  /**
   * Table caption (required for accessibility)
   */
  caption: string;
  /**
   * Column definitions
   */
  columns: TableColumn[];
  /**
   * Table data rows
   */
  data: Array<Record<string, React.ReactNode>>;
  /**
   * Whether table is sortable
   */
  isSortable?: boolean;
  /**
   * Current sort column
   */
  sortedBy?: string;
  /**
   * Sort direction
   */
  sortDirection?: 'asc' | 'desc';
  /**
   * Callback when sort is requested
   */
  onSort?: (columnId: string) => void;
  /**
   * Optional row actions
   */
  renderRowActions?: (row: Record<string, React.ReactNode>, index: number) => React.ReactNode;
}

/**
 * Accessible table component with proper ARIA table semantics
 */
export const AccessibleTable = React.forwardRef<HTMLDivElement, AccessibleTableProps>(
  (
    {
      caption,
      columns,
      data,
      isSortable = false,
      sortedBy,
      sortDirection = 'asc',
      onSort,
      renderRowActions,
    },
    ref
  ) => {
    return (
      <section ref={ref} aria-label="Data table" className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{caption}</caption>
          
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  role="columnheader"
                  aria-sort={sortedBy === column.id ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
                >
                  {isSortable && column.sortable ? (
                    <button
                      onClick={() => onSort?.(column.id)}
                      className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded"
                      aria-label={`Sort by ${column.header}`}
                    >
                      {column.header}
                      {sortedBy === column.id && (
                        <span aria-hidden="true">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
              {renderRowActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderRowActions ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={row.id ? String(row.id) : String(index)} role="row">
                  {columns.map((column) => {
                    const alignClass = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : '';
                    return (
                    <TableCell
                      key={row.id ? `${String(row.id)}-${column.id}` : `${index}-${column.id}`}
                      className={alignClass}
                    >
                      {row[column.id]}
                    </TableCell>
                    );
                  })}
                  {renderRowActions && (
                    <TableCell>{renderRowActions(row, index)}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    );
  }
);

AccessibleTable.displayName = 'AccessibleTable';
