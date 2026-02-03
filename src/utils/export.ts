/**
 * CSV export utility for data tables
 */

export interface ExportOptions {
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: (keyof T)[],
  options: ExportOptions = {}
): void {
  const {
    filename = `export_${new Date().toISOString().split('T')[0]}.csv`,
    delimiter = ',',
    includeHeaders = true,
  } = options;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create headers
  let csv = '';
  if (includeHeaders) {
    csv = columns.map((col) => escapeCSV(String(col))).join(delimiter) + '\n';
  }

  // Add data rows
  csv += data
    .map((row) =>
      columns
        .map((col) => {
          let value: any = row[col] ?? '';
          // Format dates
          if (value && typeof value === 'object' && 'toISOString' in value) {
            value = (value as Date).toISOString().split('T')[0];
          }
          return escapeCSV(String(value));
        })
        .join(delimiter)
    )
    .join('\n');

  // Trigger download
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export data as JSON
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  filename: string = `export_${new Date().toISOString().split('T')[0]}.json`
): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, 'application/json');
}

/**
 * Export data as TXT (formatted as table)
 */
export function exportToTXT<T extends Record<string, any>>(
  data: T[],
  columns: (keyof T)[],
  filename: string = `export_${new Date().toISOString().split('T')[0]}.txt`
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  let txt = columns.map((col) => String(col).padEnd(20)).join(' ') + '\n';
  txt += columns.map(() => ''.padEnd(20, '-')).join(' ') + '\n';

  txt += data
    .map((row) =>
      columns
        .map((col) => String(row[col] ?? '').padEnd(20))
        .join(' ')
    )
    .join('\n');

  downloadFile(txt, filename, 'text/plain');
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
