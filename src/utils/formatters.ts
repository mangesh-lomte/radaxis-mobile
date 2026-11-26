/**
 * RadAxis RIS Mobile — Safe Formatting Utility
 * Protects application from runtime crashes due to undefined, null, NaN, or non-numeric values.
 * Never silently turns genuinely missing financial/clinical data into misleading zero values.
 */

/**
 * Checks whether a given value is a valid, finite number or numeric string.
 */
export function isValidNumber(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const num = typeof value === 'number' ? value : Number(value);
  return typeof num === 'number' && !isNaN(num) && isFinite(num);
}

/**
 * Safely parses any value to a finite number or returns the fallback (default 0).
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  return typeof num === 'number' && !isNaN(num) && isFinite(num) ? num : fallback;
}

export interface FormatCurrencyOptions {
  symbol?: string;
  decimals?: number;
  fallback?: string;
}

/**
 * Safely format monetary and billing values with currency symbol.
 * If value is missing or invalid, returns fallback ('N/A' or specified) without crashing.
 * Never silently turns genuinely missing financial/clinical data into misleading zero values.
 */
export function formatCurrency(
  value: unknown,
  options: FormatCurrencyOptions = {}
): string {
  const { symbol = '₹', decimals = 2, fallback = 'N/A' } = options;
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  if (num < 0) {
    return `-${symbol}${Math.abs(num).toFixed(decimals)}`;
  }
  return `${symbol}${num.toFixed(decimals)}`;
}

export interface FormatNumberOptions {
  decimals?: number;
  fallback?: string;
}

/**
 * Safely format numeric quantities, counts, and measurements.
 */
export function formatNumber(
  value: unknown,
  options: FormatNumberOptions = {}
): string {
  const { decimals, fallback = 'N/A' } = options;
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  return decimals !== undefined ? num.toFixed(decimals) : num.toString();
}

/**
 * Safely format percentage metrics.
 */
export function formatPercent(
  value: unknown,
  options: FormatNumberOptions = {}
): string {
  const { decimals = 0, fallback = 'N/A' } = options;
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  return `${num.toFixed(decimals)}%`;
}

/**
 * Safely format file sizes in bytes to KB or MB.
 */
export function formatFileSize(
  bytes: unknown,
  options: { fallback?: string } = {}
): string {
  const { fallback = 'N/A' } = options;
  if (!isValidNumber(bytes)) {
    return fallback;
  }
  const numBytes = safeNumber(bytes);
  if (numBytes < 0) {
    return fallback;
  }
  if (numBytes === 0) {
    return '0 B';
  }
  if (numBytes < 1024) {
    return `${numBytes} B`;
  }
  if (numBytes >= 1024 * 1024) {
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(numBytes / 1024).toFixed(1)} KB`;
}

export interface FormatDateOptions {
  format?: 'date' | 'time' | 'datetime';
  fallback?: string;
}

/**
 * Safely format ISO timestamps and date strings without throwing errors.
 */
export function formatDate(
  value: unknown,
  options: FormatDateOptions = {}
): string {
  const { format = 'date', fallback = 'N/A' } = options;
  if (!value) return fallback;

  try {
    const d = new Date(value as string | number | Date);
    if (isNaN(d.getTime())) return fallback;

    switch (format) {
      case 'time':
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'datetime':
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      case 'date':
      default:
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {
    return fallback;
  }
}
