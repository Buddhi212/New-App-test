import * as XLSX from 'xlsx';

export type ColumnType = 'text' | 'number' | 'date' | 'select';

export interface ColumnDef {
  id: string;
  label: string;
  type: ColumnType;
  required?: boolean;
  options?: string[];
}

export interface RowData {
  id: string;
  values: Record<string, string>;
}

export interface SheetTemplate {
  id: string;
  name: string;
  description: string;
  sheetName: string;
  fileName: string;
  columns: ColumnDef[];
  rows: RowData[];
}

export interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface ColumnStat {
  filled: number;
  sum?: number;
  avg?: number;
}

export const SHEET_TEMPLATES: SheetTemplate[] = [
  {
    id: 'general',
    name: 'General Data Entry',
    description: 'Balanced table for items, quantities, values, dates, and notes.',
    sheetName: 'DataEntry',
    fileName: 'data-entry-export',
    columns: [
      { id: 'col_name', label: 'Item / Name', type: 'text', required: true },
      {
        id: 'col_category',
        label: 'Category',
        type: 'select',
        options: ['Operations', 'Engineering', 'Marketing', 'Finance', 'General'],
      },
      { id: 'col_qty', label: 'Quantity', type: 'number' },
      { id: 'col_price', label: 'Unit Price', type: 'number' },
      { id: 'col_date', label: 'Date', type: 'date' },
      { id: 'col_notes', label: 'Notes', type: 'text' },
    ],
    rows: [
      {
        id: 'row_1',
        values: {
          col_name: 'Thermal Sensor Module',
          col_category: 'Engineering',
          col_qty: '12',
          col_price: '48.50',
          col_date: '2026-11-18',
          col_notes: 'Batch A calibration units',
        },
      },
      {
        id: 'row_2',
        values: {
          col_name: 'Warehouse Barcode Labels',
          col_category: 'Operations',
          col_qty: '500',
          col_price: '0.18',
          col_date: '2026-11-19',
          col_notes: 'Roll stock replenishment',
        },
      },
      {
        id: 'row_3',
        values: {
          col_name: 'Q4 Print Brochure Run',
          col_category: 'Marketing',
          col_qty: '250',
          col_price: '2.40',
          col_date: '2026-11-20',
          col_notes: 'Trade show handouts',
        },
      },
      {
        id: 'row_4',
        values: {
          col_name: 'Quarterly Audit Binder',
          col_category: 'Finance',
          col_qty: '6',
          col_price: '19.00',
          col_date: '2026-11-21',
          col_notes: 'Archived copies',
        },
      },
    ],
  },
  {
    id: 'contacts',
    name: 'Contact Directory',
    description: 'Names, emails, companies, and roles ready for CRM import.',
    sheetName: 'Contacts',
    fileName: 'contacts-directory',
    columns: [
      { id: 'col_full_name', label: 'Full Name', type: 'text', required: true },
      { id: 'col_email', label: 'Email', type: 'text' },
      { id: 'col_company', label: 'Company', type: 'text' },
      { id: 'col_role', label: 'Role', type: 'text' },
      { id: 'col_phone', label: 'Phone', type: 'text' },
    ],
    rows: [
      {
        id: 'row_c1',
        values: {
          col_full_name: 'Maya Lin',
          col_email: 'maya.lin@northstar.io',
          col_company: 'Northstar Logistics',
          col_role: 'Operations Lead',
          col_phone: '+1 415 555 0142',
        },
      },
      {
        id: 'row_c2',
        values: {
          col_full_name: 'David Okafor',
          col_email: 'd.okafor@meridianlabs.co',
          col_company: 'Meridian Labs',
          col_role: 'Procurement Manager',
          col_phone: '+1 212 555 0198',
        },
      },
    ],
  },
  {
    id: 'expenses',
    name: 'Expense Log',
    description: 'Track receipts, categories, payment methods, and amounts.',
    sheetName: 'Expenses',
    fileName: 'expense-log',
    columns: [
      { id: 'col_exp_date', label: 'Date', type: 'date', required: true },
      { id: 'col_merchant', label: 'Merchant', type: 'text', required: true },
      {
        id: 'col_exp_cat',
        label: 'Category',
        type: 'select',
        options: ['Travel', 'Software', 'Supplies', 'Meals', 'Utilities'],
      },
      { id: 'col_amount', label: 'Amount', type: 'number', required: true },
      {
        id: 'col_method',
        label: 'Payment Method',
        type: 'select',
        options: ['Corporate Card', 'Bank Transfer', 'Cash', 'Reimbursement'],
      },
    ],
    rows: [
      {
        id: 'row_e1',
        values: {
          col_exp_date: '2026-11-15',
          col_merchant: 'CloudHost Services',
          col_exp_cat: 'Software',
          col_amount: '149.00',
          col_method: 'Corporate Card',
        },
      },
      {
        id: 'row_e2',
        values: {
          col_exp_date: '2026-11-17',
          col_merchant: 'Metro Rail Pass',
          col_exp_cat: 'Travel',
          col_amount: '64.50',
          col_method: 'Corporate Card',
        },
      },
    ],
  },
  {
    id: 'bills',
    name: 'Bill & Receipt Log',
    description: 'Columns tailored for scanned bills: vendor, date, invoice #, tax, and total.',
    sheetName: 'Bills',
    fileName: 'scanned-bills',
    columns: [
      { id: 'col_vendor', label: 'Vendor', type: 'text', required: true },
      { id: 'col_bill_date', label: 'Date', type: 'date' },
      { id: 'col_invoice_no', label: 'Invoice #', type: 'text' },
      { id: 'col_tax', label: 'Tax', type: 'number' },
      { id: 'col_total', label: 'Total', type: 'number', required: true },
    ],
    rows: [],
  },
  {
    id: 'blank',
    name: 'Blank Sheet',
    description: 'Start fresh with three empty text columns.',
    sheetName: 'Sheet1',
    fileName: 'custom-sheet',
    columns: [
      { id: 'col_a', label: 'Field 1', type: 'text', required: true },
      { id: 'col_b', label: 'Field 2', type: 'text' },
      { id: 'col_c', label: 'Value', type: 'number' },
    ],
    rows: [],
  },
];

export function sanitizeFileName(rawName: string): string {
  const trimmed = rawName.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
  const base = trimmed.replace(/\.xlsx$/i, '').replace(/^-+|-+$/g, '') || 'data-export';
  return `${base}.xlsx`;
}

export function sanitizeSheetName(rawName: string): string {
  const cleaned = rawName.replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
  const sliced = cleaned.slice(0, 31).trim();
  return sliced || 'Sheet1';
}

export function createEmptyDraft(columns: ColumnDef[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const col of columns) {
    if (col.type === 'select' && col.options && col.options.length > 0) {
      draft[col.id] = col.options[0];
    } else if (col.type === 'date') {
      draft[col.id] = new Date().toISOString().slice(0, 10);
    } else {
      draft[col.id] = '';
    }
  }
  return draft;
}

export function validateRowInput(
  columns: ColumnDef[],
  draft: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  let hasAnyValue = false;

  for (const col of columns) {
    const raw = (draft[col.id] ?? '').trim();
    if (raw.length > 0) {
      hasAnyValue = true;
    }
    if (col.required && raw.length === 0) {
      errors[col.id] = `${col.label} is required`;
      continue;
    }
    if (col.type === 'number' && raw.length > 0) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        errors[col.id] = `${col.label} must be a valid number`;
      }
    }
  }

  if (!hasAnyValue && columns.length > 0 && Object.keys(errors).length === 0) {
    errors[columns[0].id] = 'Enter at least one value before adding a row';
  }

  return errors;
}

export function filterRows(
  rows: RowData[],
  columns: ColumnDef[],
  query: string
): RowData[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }
  return rows.filter((row) =>
    columns.some((col) => (row.values[col.id] ?? '').toLowerCase().includes(normalized))
  );
}

export function sortRows(
  rows: RowData[],
  columns: ColumnDef[],
  sort: SortConfig | null
): RowData[] {
  if (!sort) {
    return rows;
  }
  const col = columns.find((c) => c.id === sort.columnId);
  if (!col) {
    return rows;
  }

  const multiplier = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const valA = (a.values[col.id] ?? '').trim();
    const valB = (b.values[col.id] ?? '').trim();

    if (valA === '' && valB === '') return 0;
    if (valA === '') return 1;
    if (valB === '') return -1;

    if (col.type === 'number') {
      const numA = Number(valA);
      const numB = Number(valB);
      if (Number.isFinite(numA) && Number.isFinite(numB)) {
        return (numA - numB) * multiplier;
      }
    }

    return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
  });
}

export function computeColumnStats(
  rows: RowData[],
  columns: ColumnDef[]
): Record<string, ColumnStat> {
  const stats: Record<string, ColumnStat> = {};

  for (const col of columns) {
    let filled = 0;
    let sum = 0;
    let numericCount = 0;

    for (const row of rows) {
      const raw = (row.values[col.id] ?? '').trim();
      if (raw !== '') {
        filled += 1;
        if (col.type === 'number') {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            sum += parsed;
            numericCount += 1;
          }
        }
      }
    }

    if (col.type === 'number') {
      stats[col.id] = {
        filled,
        sum,
        avg: numericCount > 0 ? sum / numericCount : 0,
      };
    } else {
      stats[col.id] = { filled };
    }
  }

  return stats;
}

export function buildWorkbook(
  columns: ColumnDef[],
  rows: RowData[],
  sheetName: string
): XLSX.WorkBook {
  const safeSheetName = sanitizeSheetName(sheetName);
  const headers = columns.map((c) => c.label);

  const dataRows = rows.map((row) =>
    columns.map((col) => {
      const raw = (row.values[col.id] ?? '').trim();
      if (raw === '') {
        return '';
      }
      if (col.type === 'number') {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : raw;
      }
      return raw;
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  worksheet['!cols'] = columns.map((col, colIdx) => {
    let maxLen = col.label.length;
    for (const r of dataRows) {
      const cellStr = String(r[colIdx] ?? '');
      if (cellStr.length > maxLen) {
        maxLen = cellStr.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 44) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  return workbook;
}

export function exportWorkbookToBytes(
  columns: ColumnDef[],
  rows: RowData[],
  sheetName: string
): Uint8Array {
  const workbook = buildWorkbook(columns, rows, sheetName);
  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(out);
}

export function exportCsvString(columns: ColumnDef[], rows: RowData[]): string {
  const escapeCsv = (val: string): string => {
    if (/[",\n\r]/.test(val)) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = columns.map((c) => escapeCsv(c.label)).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((col) => escapeCsv((row.values[col.id] ?? '').trim())).join(',')
  );

  return [headerLine, ...bodyLines].join('\n');
}
