/**
 * Test Suite: Runtime Safety & Numerical / Contract Defensive Formatting
 *
 * Verifies:
 * 1. formatCurrency defensive handling (undefined, null, NaN, strings, negative, zero, custom fallback/symbols)
 * 2. formatNumber defensive handling
 * 3. formatPercent defensive handling
 * 4. formatFileSize defensive handling
 * 5. formatDate defensive handling (invalid dates, nulls, custom formats)
 * 6. safeNumber & isValidNumber boundary conditions
 * 7. Billing API response normalization pipeline (string decimals, missing balance, missing amounts)
 */

import {
  formatCurrency,
  formatDate,
  formatFileSize,
  formatNumber,
  formatPercent,
  isValidNumber,
  safeNumber,
} from '../src/utils/formatters';

export function runRuntimeSafetyTests(): { passed: boolean; total: number; errors: string[] } {
  const errors: string[] = [];
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedCount++;
    } else {
      errors.push(`FAILED: ${testName}`);
    }
  }

  // --- 1. formatCurrency ---
  // In healthcare RIS, missing financial data must never be silently masked as ₹0.00.
  assert(formatCurrency(undefined) === 'N/A', 'formatCurrency(undefined) returns N/A (not misleading zero)');
  assert(formatCurrency(null) === 'N/A', 'formatCurrency(null) returns N/A (not misleading zero)');
  assert(formatCurrency(NaN) === 'N/A', 'formatCurrency(NaN) returns N/A (not misleading zero)');
  assert(formatCurrency('') === 'N/A', 'formatCurrency("") returns N/A (not misleading zero)');
  assert(formatCurrency('abc') === 'N/A', 'formatCurrency("abc") returns N/A (not misleading zero)');
  assert(formatCurrency(0) === '₹0.00', 'formatCurrency(0) returns ₹0.00 (legitimate zero)');
  assert(formatCurrency(450) === '₹450.00', 'formatCurrency(450) returns ₹450.00');
  assert(formatCurrency(450.5) === '₹450.50', 'formatCurrency(450.5) returns ₹450.50');
  assert(formatCurrency('1250.75') === '₹1250.75', 'formatCurrency("1250.75") parses string decimal');
  assert(formatCurrency(-150) === '-₹150.00', 'formatCurrency(-150) formats negative numbers cleanly');
  assert(formatCurrency(75, { symbol: '$' }) === '$75.00', 'formatCurrency with custom $ symbol');
  assert(formatCurrency(undefined, { fallback: '-' }) === '-', 'formatCurrency with custom fallback returns "-"');
  assert(formatCurrency(500, { decimals: 0 }) === '₹500', 'formatCurrency with decimals: 0');

  // --- 2. formatNumber ---
  assert(formatNumber(undefined) === 'N/A', 'formatNumber(undefined) returns "N/A"');
  assert(formatNumber(null) === 'N/A', 'formatNumber(null) returns "N/A"');
  assert(formatNumber(NaN) === 'N/A', 'formatNumber(NaN) returns "N/A"');
  assert(formatNumber(42) === '42', 'formatNumber(42) returns "42"');
  assert(formatNumber(128.46, { decimals: 1 }) === '128.5', 'formatNumber(128.46, decimals: 1) rounds to 128.5');
  assert(formatNumber(null, { fallback: '-' }) === '-', 'formatNumber(null, fallback: "-") returns "-"');

  // --- 3. formatPercent ---
  assert(formatPercent(undefined) === 'N/A', 'formatPercent(undefined) returns "N/A"');
  assert(formatPercent(99.456, { decimals: 1 }) === '99.5%', 'formatPercent(99.456, 1) returns "99.5%"');
  assert(formatPercent('75.2', { decimals: 0 }) === '75%', 'formatPercent("75.2", 0) returns "75%"');

  // --- 4. formatFileSize ---
  assert(formatFileSize(undefined) === 'N/A', 'formatFileSize(undefined) returns "N/A"');
  assert(formatFileSize(null) === 'N/A', 'formatFileSize(null) returns "N/A"');
  assert(formatFileSize(NaN) === 'N/A', 'formatFileSize(NaN) returns "N/A"');
  assert(formatFileSize(0) === '0 B', 'formatFileSize(0) returns "0 B"');
  assert(formatFileSize(512) === '512 B', 'formatFileSize(512) returns "512 B"');
  assert(formatFileSize(2048) === '2.0 KB', 'formatFileSize(2048) returns "2.0 KB"');
  assert(formatFileSize(1048576 * 2.5) === '2.5 MB', 'formatFileSize(2.5MB) returns "2.5 MB"');

  // --- 5. formatDate ---
  assert(formatDate(undefined) === 'N/A', 'formatDate(undefined) returns "N/A"');
  assert(formatDate(null) === 'N/A', 'formatDate(null) returns "N/A"');
  assert(formatDate('') === 'N/A', 'formatDate("") returns "N/A"');
  assert(formatDate('invalid-date-string') === 'N/A', 'formatDate("invalid-date-string") returns "N/A"');
  const validIso = '2026-11-21T10:30:00.000Z';
  assert(formatDate(validIso) !== 'N/A' && formatDate(validIso).length > 0, 'formatDate(validIso) formats date cleanly');
  assert(formatDate(validIso, { format: 'time' }).includes(':'), 'formatDate(validIso, format: "time") formats time');

  // --- 6. safeNumber & isValidNumber ---
  assert(safeNumber(undefined) === 0, 'safeNumber(undefined) === 0');
  assert(safeNumber(null) === 0, 'safeNumber(null) === 0');
  assert(safeNumber(NaN) === 0, 'safeNumber(NaN) === 0');
  assert(safeNumber('3.1415') === 3.1415, 'safeNumber("3.1415") parses float');
  assert(safeNumber(undefined, 99) === 99, 'safeNumber fallback parameter works');
  assert(!isValidNumber(undefined), 'isValidNumber(undefined) is false');
  assert(!isValidNumber(null), 'isValidNumber(null) is false');
  assert(!isValidNumber(NaN), 'isValidNumber(NaN) is false');
  assert(!isValidNumber(''), 'isValidNumber("") is false');
  assert(!isValidNumber('abc'), 'isValidNumber("abc") is false');
  assert(isValidNumber(0), 'isValidNumber(0) is true');
  assert(isValidNumber('0'), 'isValidNumber("0") is true');
  assert(isValidNumber(123.45), 'isValidNumber(123.45) is true');

  // --- 7. Billing API Normalization Pipeline Simulation ---
  // Simulate raw backend invoice payload returned from Prisma / Express
  const rawBackendInvoice: any = {
    id: 'INV-TEST-001',
    invoiceNumber: 'INV-2026-001',
    patientId: 'PAT-100',
    patientName: 'Jane Doe',
    accessionNumber: 'ACC-001',
    grossAmount: '4500.00', // Prisma Decimal serialized as string
    discount: '300.00',
    taxAmount: '225.00',
    total: '4425.00',
    paidAmount: '2000.00',
    outstandingAmount: '2425.00', // Real backend uses outstandingAmount!
    // Notice: `balance` is MISSING from backend response
    status: 'PARTIALLY_PAID',
    createdAt: '2026-11-20T10:00:00.000Z',
    items: [
      {
        id: 'ITEM-1',
        description: 'Brain MRI without contrast',
        modality: 'MRI',
        quantity: 1,
        unitPrice: '4500.00',
        totalPrice: '4500.00',
      },
    ],
  };

  // Normalization logic equivalent to billingService.normalizeInvoiceDetail
  const gross = safeNumber(rawBackendInvoice.grossAmount);
  const discount = safeNumber(rawBackendInvoice.discount);
  const tax = safeNumber(rawBackendInvoice.taxAmount);
  const total = safeNumber(rawBackendInvoice.total);
  const paid = safeNumber(rawBackendInvoice.paidAmount);
  const outstanding = safeNumber(rawBackendInvoice.outstandingAmount, total - paid);
  const balance = safeNumber(rawBackendInvoice.balance, outstanding);

  assert(typeof gross === 'number' && gross === 4500, 'Normalized gross is numeric 4500');
  assert(typeof discount === 'number' && discount === 300, 'Normalized discount is numeric 300');
  assert(typeof tax === 'number' && tax === 225, 'Normalized tax is numeric 225');
  assert(typeof total === 'number' && total === 4425, 'Normalized total is numeric 4425');
  assert(typeof paid === 'number' && paid === 2000, 'Normalized paid is numeric 2000');
  assert(typeof outstanding === 'number' && outstanding === 2425, 'Normalized outstanding is numeric 2425');
  assert(typeof balance === 'number' && balance === 2425, 'Normalized balance is numeric 2425 (populated from outstandingAmount)');

  // Ensure calling toFixed on normalized balance never throws
  assert(balance.toFixed(2) === '2425.00', 'balance.toFixed(2) produces "2425.00" without crashing');
  assert(formatCurrency(balance) === '₹2425.00', 'formatCurrency(balance) produces "₹2425.00"');

  // Verify missing items array doesn't crash
  const rawEmptyInvoice: any = { id: 'INV-EMPTY' };
  const safeItems = Array.isArray(rawEmptyInvoice.items) ? rawEmptyInvoice.items : [];
  assert(safeItems.length === 0, 'Empty items fallback handles undefined items safely');

  return {
    passed: errors.length === 0,
    total: totalTests,
    errors,
  };
}

const result = runRuntimeSafetyTests();
console.log(`Runtime Safety Tests: ${result.passed ? 'ALL PASSED' : 'FAILED'} (${result.total} checks)`);
if (!result.passed) {
  console.error(result.errors.join('\n'));
  process.exit(1);
}
