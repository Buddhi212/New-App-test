import type { ColumnDef } from './sheetLogic';

export interface ParsedBillFields {
  vendor: string;
  date: string;
  invoiceNumber: string;
  total: string;
  tax: string;
}

const GENERIC_HEADER_RE =
  /^(tax\s*invoice|invoice|receipt|bill|sales\s*receipt|customer\s*copy|merchant\s*copy|welcome|thank\s*you|duplicate|reprint|statement|order\s*confirmation)$/i;

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeYear(rawYear: string): string {
  if (rawYear.length === 2) {
    const y = parseInt(rawYear, 10);
    return y >= 70 ? `19${rawYear}` : `20${rawYear}`;
  }
  return rawYear;
}

function formatValidDate(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function extractDate(text: string): string {
  // 1. YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = text.match(/\b(20\d{2}|19\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoMatch) {
    const formatted = formatValidDate(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10),
      parseInt(isoMatch[3], 10)
    );
    if (formatted) return formatted;
  }

  // 2. Named month: "Nov 22, 2026" or "November 22 2026"
  const monthFirstMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2}|19\d{2})\b/i
  );
  if (monthFirstMatch) {
    const m = MONTH_MAP[monthFirstMatch[1].toLowerCase()];
    if (m) {
      const formatted = formatValidDate(
        parseInt(monthFirstMatch[3], 10),
        parseInt(m, 10),
        parseInt(monthFirstMatch[2], 10)
      );
      if (formatted) return formatted;
    }
  }

  // 3. Day first with named month: "22 Nov 2026" or "22-Nov-2026"
  const dayFirstNamedMatch = text.match(
    /\b(\d{1,2})[-\s]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-\s,]+(20\d{2}|19\d{2})\b/i
  );
  if (dayFirstNamedMatch) {
    const m = MONTH_MAP[dayFirstNamedMatch[2].toLowerCase()];
    if (m) {
      const formatted = formatValidDate(
        parseInt(dayFirstNamedMatch[3], 10),
        parseInt(m, 10),
        parseInt(dayFirstNamedMatch[1], 10)
      );
      if (formatted) return formatted;
    }
  }

  // 4. Numeric slash/dash date: MM/DD/YYYY or DD/MM/YYYY
  const numericMatch = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (numericMatch) {
    const p1 = parseInt(numericMatch[1], 10);
    const p2 = parseInt(numericMatch[2], 10);
    const year = parseInt(normalizeYear(numericMatch[3]), 10);
    // If p1 > 12, it must be DD/MM/YYYY; otherwise default MM/DD/YYYY
    const month = p1 > 12 ? p2 : p1;
    const day = p1 > 12 ? p1 : p2;
    const formatted = formatValidDate(year, month, day);
    if (formatted) return formatted;
  }

  return '';
}

export function extractVendor(lines: string[]): string {
  for (const rawLine of lines.slice(0, 8)) {
    const line = rawLine.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9.&')-]+$/g, '').trim();
    if (line.length < 3) continue;
    if (GENERIC_HEADER_RE.test(line)) continue;
    // Skip lines that are mostly digits, dates, times, or phone numbers
    if (/^[\d\s\-/:.+()$]+$/.test(line)) continue;
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(line)) continue;
    if (/^(tel|phone|fax|date|time|inv|invoice|bill|receipt|gst|vat|tin|abn)\b/i.test(line)) {
      continue;
    }
    const letters = (line.match(/[a-zA-Z]/g) ?? []).length;
    if (letters < 3) continue;
    return line;
  }
  return '';
}

export function extractInvoiceNumber(text: string): string {
  const patterns = [
    /\b(?:invoice|inv|bill|receipt|order|check|chk|ref|txn|transaction)[ \t]*(?:no\.?\b|number\b|num\b|#|:)[ \t:#\-]*([A-Z0-9][A-Z0-9\-/]{2,24})/gi,
    /\b(?:inv|bill)[ \t]*#[ \t]*([A-Z0-9][A-Z0-9\-/]{1,24})/gi,
    /#[ \t]*([A-Z]{1,4}-?\d{3,16}|\d{4,16})\b/gi,
  ];

  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      if (match[1]) {
        const candidate = match[1].trim().replace(/[.,;:]+$/, '');
        if (/\d/.test(candidate)) {
          return candidate;
        }
      }
    }
  }
  return '';
}

function extractMoneyFromLine(line: string): string | null {
  const matches = [...line.matchAll(/(?:[$€£¥]|USD|EUR|GBP|CAD|AUD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2}|\d+(?:,\d{3})*)\b/gi)];
  if (matches.length === 0) return null;

  // Prefer the last number with decimals, or the last number on the line
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const raw = matches[i][1].replace(/,/g, '');
    if (raw.includes('.')) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n.toFixed(2);
    }
  }
  const fallbackRaw = matches[matches.length - 1][1].replace(/,/g, '');
  const n = Number(fallbackRaw);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

export function extractTax(lines: string[]): string {
  const candidates: string[] = [];

  for (const line of lines) {
    if (/\b(tax\s*id|tax\s*no|tax\s*#|taxable|before\s*tax|pre-tax|excl\.?\s*tax)\b/i.test(line)) {
      continue;
    }
    if (/\b(sales\s*tax|state\s*tax|local\s*tax|tax|vat|gst|hst|pst)\b/i.test(line)) {
      const money = extractMoneyFromLine(line);
      if (money !== null) {
        candidates.push(money);
      }
    }
  }

  return candidates.length > 0 ? candidates[candidates.length - 1] : '';
}

export function extractTotal(lines: string[]): string {
  let priorityTotal = '';
  let fallbackTotal = '';

  for (const line of lines) {
    if (/\b(sub[-\s]*total|before\s*tax|total\s*items|total\s*qty|total\s*quantity|total\s*tax|total\s*savings|total\s*discount)\b/i.test(line)) {
      continue;
    }

    if (/\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*amount|net\s*total|order\s*total)\b/i.test(line)) {
      const money = extractMoneyFromLine(line);
      if (money !== null) {
        priorityTotal = money;
      }
      continue;
    }

    if (/\btotal\b/i.test(line)) {
      const money = extractMoneyFromLine(line);
      if (money !== null) {
        fallbackTotal = money;
      }
    }
  }

  return priorityTotal || fallbackTotal;
}

export function parseBillText(rawText: string): ParsedBillFields {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    vendor: extractVendor(lines),
    date: extractDate(rawText),
    invoiceNumber: extractInvoiceNumber(rawText),
    total: extractTotal(lines),
    tax: extractTax(lines),
  };
}

export interface BillSavePlan {
  columnsToAdd: ColumnDef[];
  rowValues: Record<string, string>;
}

export function buildBillRowPlan(
  existingColumns: ColumnDef[],
  bill: ParsedBillFields,
  ensureBillColumns: boolean
): BillSavePlan {
  const columnsToAdd: ColumnDef[] = [];
  const allCols = [...existingColumns];

  const findColumn = (keywords: string[]): ColumnDef | undefined =>
    allCols.find((col) =>
      keywords.some((kw) => col.label.toLowerCase().includes(kw))
    );

  const ensureCol = (
    keywords: string[],
    fallbackDef: Omit<ColumnDef, 'id'>
  ): ColumnDef | undefined => {
    const existing = findColumn(keywords);
    if (existing) return existing;
    if (!ensureBillColumns) return undefined;

    const newCol: ColumnDef = {
      id: `col_bill_${fallbackDef.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`,
      ...fallbackDef,
    };
    columnsToAdd.push(newCol);
    allCols.push(newCol);
    return newCol;
  };

  const vendorCol = ensureCol(['vendor', 'merchant', 'item', 'name', 'supplier'], {
    label: 'Vendor',
    type: 'text',
    required: true,
  });
  const dateCol = ensureCol(['date'], { label: 'Date', type: 'date' });
  const invoiceCol = ensureCol(['invoice', 'bill', 'receipt', 'ref'], {
    label: 'Invoice #',
    type: 'text',
  });
  const taxCol = ensureCol(['tax', 'vat', 'gst'], { label: 'Tax', type: 'number' });
  const totalCol = ensureCol(['total', 'amount', 'price', 'value'], {
    label: 'Total',
    type: 'number',
  });

  const rowValues: Record<string, string> = {};
  for (const col of allCols) {
    if (col.type === 'select' && col.options && col.options.length > 0) {
      rowValues[col.id] = col.options[0];
    } else {
      rowValues[col.id] = '';
    }
  }

  if (vendorCol) rowValues[vendorCol.id] = bill.vendor.trim();
  if (dateCol && bill.date) rowValues[dateCol.id] = bill.date.trim();
  if (invoiceCol && bill.invoiceNumber) rowValues[invoiceCol.id] = bill.invoiceNumber.trim();
  if (taxCol && bill.tax) rowValues[taxCol.id] = bill.tax.trim();
  if (totalCol && bill.total) rowValues[totalCol.id] = bill.total.trim();

  // Helpful fallback if mapping into an existing sheet without dedicated Invoice/Tax/Qty columns
  const qtyCol = findColumn(['qty', 'quantity']);
  if (qtyCol && !rowValues[qtyCol.id]) {
    rowValues[qtyCol.id] = '1';
  }

  const notesCol = findColumn(['note', 'memo', 'description']);
  if (notesCol && !rowValues[notesCol.id]) {
    const parts: string[] = [];
    if (!invoiceCol && bill.invoiceNumber) parts.push(`Bill #${bill.invoiceNumber}`);
    if (!taxCol && bill.tax) parts.push(`Tax: ${bill.tax}`);
    if (parts.length > 0) {
      rowValues[notesCol.id] = parts.join(' · ');
    }
  }

  return { columnsToAdd, rowValues };
}
