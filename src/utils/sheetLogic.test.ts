import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  SHEET_TEMPLATES,
  sanitizeFileName,
  sanitizeSheetName,
  validateRowInput,
  filterRows,
  sortRows,
  computeColumnStats,
  exportWorkbookToBytes,
  exportCsvString,
  type ColumnDef,
  type RowData,
} from './sheetLogic';

test('sanitizeFileName normalizes filenames and appends .xlsx extension', () => {
  assert.equal(sanitizeFileName('monthly-report'), 'monthly-report.xlsx');
  assert.equal(sanitizeFileName('budget.xlsx'), 'budget.xlsx');
  assert.equal(sanitizeFileName('  invalid/name:*?  '), 'invalid-name.xlsx');
  assert.equal(sanitizeFileName('   '), 'data-export.xlsx');
});

test('sanitizeSheetName obeys Excel 31-char limit and invalid char rules', () => {
  assert.equal(sanitizeSheetName('Q4/Data:Sheet*[1]'), 'Q4 Data Sheet 1');
  const longName = sanitizeSheetName(
    'A very long worksheet tab name exceeding thirty one characters'
  );
  assert.ok(longName.length <= 31 && longName.length > 0);
  assert.equal(sanitizeSheetName('SheetNameExceedingThirtyOneCharacters123').length, 31);
  assert.equal(sanitizeSheetName('???'), 'Sheet1');
});

test('validateRowInput enforces required fields and numeric parsing', () => {
  const cols: ColumnDef[] = [
    { id: 'name', label: 'Item Name', type: 'text', required: true },
    { id: 'qty', label: 'Quantity', type: 'number' },
  ];

  const missingReq = validateRowInput(cols, { name: '  ', qty: '5' });
  assert.equal(missingReq.name, 'Item Name is required');

  const badNum = validateRowInput(cols, { name: 'Bolt', qty: 'abc' });
  assert.equal(badNum.qty, 'Quantity must be a valid number');

  const valid = validateRowInput(cols, { name: 'Bolt', qty: '12.5' });
  assert.deepEqual(valid, {});
});

test('filterRows and sortRows handle text and numeric sorting accurately', () => {
  const cols: ColumnDef[] = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'amount', label: 'Amount', type: 'number' },
  ];
  const rows: RowData[] = [
    { id: '1', values: { name: 'Gamma', amount: '100' } },
    { id: '2', values: { name: 'Alpha', amount: '25.5' } },
    { id: '3', values: { name: 'Beta', amount: '9' } },
  ];

  const filtered = filterRows(rows, cols, 'alp');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '2');

  const sortedAsc = sortRows(rows, cols, { columnId: 'amount', direction: 'asc' });
  assert.deepEqual(
    sortedAsc.map((r) => r.id),
    ['3', '2', '1']
  );

  const sortedDesc = sortRows(rows, cols, { columnId: 'name', direction: 'desc' });
  assert.deepEqual(
    sortedDesc.map((r) => r.id),
    ['1', '3', '2']
  );
});

test('computeColumnStats calculates filled count, sum, and average for numeric columns', () => {
  const template = SHEET_TEMPLATES[0];
  const stats = computeColumnStats(template.rows, template.columns);

  assert.equal(stats.col_name.filled, 4);
  assert.equal(stats.col_qty.sum, 768);
  assert.equal(stats.col_qty.avg, 192);
});

test('exportWorkbookToBytes creates a valid .xlsx workbook readable back via SheetJS', () => {
  const cols: ColumnDef[] = [
    { id: 'item', label: 'Item', type: 'text', required: true },
    { id: 'count', label: 'Count', type: 'number' },
    { id: 'price', label: 'Unit Price', type: 'number' },
  ];
  const rows: RowData[] = [
    { id: 'r1', values: { item: 'Widget A', count: '10', price: '4.25' } },
    { id: 'r2', values: { item: 'Widget B', count: '3', price: '12' } },
  ];

  const bytes = exportWorkbookToBytes(cols, rows, 'TestSheet');
  // XLSX files are ZIP archives starting with PK (0x50, 0x4B)
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);

  const parsed = XLSX.read(bytes, { type: 'array' });
  assert.deepEqual(parsed.SheetNames, ['TestSheet']);

  const sheet = parsed.Sheets['TestSheet'];
  const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });
  assert.deepEqual(matrix, [
    ['Item', 'Count', 'Unit Price'],
    ['Widget A', 10, 4.25],
    ['Widget B', 3, 12],
  ]);
});

test('exportCsvString properly escapes commas and quotes', () => {
  const cols: ColumnDef[] = [
    { id: 'a', label: 'Name', type: 'text' },
    { id: 'b', label: 'Note', type: 'text' },
  ];
  const rows: RowData[] = [
    { id: 'r1', values: { a: 'Acme, Inc.', b: 'Said "Hello"' } },
  ];

  const csv = exportCsvString(cols, rows);
  assert.equal(csv, 'Name,Note\n"Acme, Inc.","Said ""Hello"""');
});
