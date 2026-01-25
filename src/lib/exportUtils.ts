/**
 * CSV and Excel export utilities
 */

export interface ExportOptions {
  filename: string;
  headers?: string[];
  includeTimestamp?: boolean;
}

/**
 * Convert data to CSV format
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  headers?: string[]
): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map((h) => `"${h}"`).join(',');

  // Create data rows
  const dataRows = data.map((item) =>
    csvHeaders
      .map((header) => {
        const value = item[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Export data as CSV file
 */
export function exportAsCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): void {
  const csv = convertToCSV(data, options.headers);

  const filename = options.includeTimestamp
    ? `${options.filename}_${new Date().toISOString().split('T')[0]}.csv`
    : `${options.filename}.csv`;

  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export data as JSON file
 */
export function exportAsJSON<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): void {
  const json = JSON.stringify(data, null, 2);

  const filename = options.includeTimestamp
    ? `${options.filename}_${new Date().toISOString().split('T')[0]}.json`
    : `${options.filename}.json`;

  downloadFile(json, filename, 'application/json;charset=utf-8;');
}

/**
 * Create Excel-compatible TSV (tab-separated values)
 * Can be opened directly in Excel
 */
export function exportAsExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): void {
  if (!data || data.length === 0) {
    return;
  }

  const headers = options.headers || Object.keys(data[0]);
  const headerRow = headers.join('\t');

  const dataRows = data.map((item) =>
    headers
      .map((header) => {
        const value = item[header];
        return value === null || value === undefined ? '' : String(value);
      })
      .join('\t')
  );

  const tsv = [headerRow, ...dataRows].join('\n');

  const filename = options.includeTimestamp
    ? `${options.filename}_${new Date().toISOString().split('T')[0]}.xlsx`
    : `${options.filename}.xlsx`;

  downloadFile(tsv, filename, 'application/vnd.ms-excel;charset=utf-8;');
}

/**
 * Download file helper
 */
function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    `data:${mimeType}${mimeType.includes('charset') ? '' : ';charset=utf-8'},${encodeURIComponent(
      content
    )}`
  );
  element.setAttribute('download', filename);
  element.style.display = 'none';

  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Generate report with summary statistics
 */
export function generateReport<T extends Record<string, any>>(
  title: string,
  data: T[],
  summary?: Record<string, any>
): string {
  const date = new Date().toLocaleString();
  let report = `${title}\n`;
  report += `Generated: ${date}\n`;
  report += `Total Records: ${data.length}\n\n`;

  if (summary) {
    report += 'SUMMARY\n';
    report += '-------\n';
    Object.entries(summary).forEach(([key, value]) => {
      report += `${key}: ${value}\n`;
    });
    report += '\n';
  }

  report += 'DATA\n';
  report += '----\n';
  report += convertToCSV(data);

  return report;
}

/**
 * Print report with nice formatting
 */
export function printReport(
  title: string,
  data: Record<string, any>[],
  summary?: Record<string, any>
): void {
  const report = generateReport(title, data, summary);

  const printWindow = window.open('', '', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(`<pre>${report}</pre>`);
    printWindow.document.close();
    printWindow.print();
  }
}
