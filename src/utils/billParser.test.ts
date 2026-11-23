import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBillRowPlan, parseBillText } from './billParser';
import { computeResizedDimensions, toGrayscalePixels } from './imagePreprocess';
import type { ColumnDef } from './sheetLogic';

test('computeResizedDimensions downscales images wider than 1600px proportionally', () => {
  assert.deepEqual(computeResizedDimensions(3200, 2400, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(computeResizedDimensions(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(computeResizedDimensions(1200, 900, 1600), { width: 1200, height: 900 });
});

test('toGrayscalePixels converts RGB channels to perceptual luminance in place', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, // pure red -> ~76
    0, 255, 0, 255, // pure green -> ~150
    100, 100, 100, 200, // already gray -> 100
  ]);
  toGrayscalePixels(pixels);

  assert.equal(pixels[0], pixels[1]);
  assert.equal(pixels[1], pixels[2]);
  assert.equal(pixels[3], 255);
  assert.equal(pixels[4], pixels[5]);
  assert.equal(pixels[5], pixels[6]);
  assert.equal(pixels[8], 100);
  assert.equal(pixels[11], 200);
});

test('parseBillText detects vendor, ISO date, invoice number, tax, and grand total', () => {
  const sample = `
    RECEIPT
    NORTHSTAR HARDWARE SUPPLY
    420 Market Street
    Date: 11/22/2026
    Invoice #: INV-2026-8412
    Subtotal: $174.50
    Sales Tax (8.25%): $14.40
    Grand Total: $188.90
    Thank you!
  `;

  const parsed = parseBillText(sample);
  assert.equal(parsed.vendor, 'NORTHSTAR HARDWARE SUPPLY');
  assert.equal(parsed.date, '2026-11-22');
  assert.equal(parsed.invoiceNumber, 'INV-2026-8412');
  assert.equal(parsed.tax, '14.40');
  assert.equal(parsed.total, '188.90');
});

test('parseBillText handles named dates, VAT, and Bill No formats', () => {
  const sample = `
    Harbor Coffee Roasters
    22 Nov 2026
    Bill No: B-99410
    Item A 10.00
    VAT 1.25
    Total Due: 11.25
  `;

  const parsed = parseBillText(sample);
  assert.equal(parsed.vendor, 'Harbor Coffee Roasters');
  assert.equal(parsed.date, '2026-11-22');
  assert.equal(parsed.invoiceNumber, 'B-99410');
  assert.equal(parsed.tax, '1.25');
  assert.equal(parsed.total, '11.25');
});

test('buildBillRowPlan maps detected fields and adds missing bill columns when enabled', () => {
  const existingCols: ColumnDef[] = [
    { id: 'col_name', label: 'Item / Name', type: 'text', required: true },
    { id: 'col_date', label: 'Date', type: 'date' },
    { id: 'col_price', label: 'Unit Price', type: 'number' },
  ];

  const plan = buildBillRowPlan(
    existingCols,
    {
      vendor: 'Acme Cafe',
      date: '2026-11-22',
      invoiceNumber: 'INV-104',
      tax: '2.10',
      total: '24.60',
    },
    true
  );

  assert.equal(plan.columnsToAdd.length, 2); // Invoice # and Tax
  assert.equal(plan.rowValues.col_name, 'Acme Cafe');
  assert.equal(plan.rowValues.col_date, '2026-11-22');
  assert.equal(plan.rowValues.col_price, '24.60');
  const invCol = plan.columnsToAdd.find((c) => c.label === 'Invoice #');
  const taxCol = plan.columnsToAdd.find((c) => c.label === 'Tax');
  assert.ok(invCol && taxCol);
  assert.equal(plan.rowValues[invCol.id], 'INV-104');
  assert.equal(plan.rowValues[taxCol.id], '2.10');
});
