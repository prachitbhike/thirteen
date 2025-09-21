import { format, parseISO, isValid } from 'date-fns';

// Currency formatting utilities
export function formatCurrency(value: bigint | number, currency = 'USD'): string {
  const numValue = typeof value === 'bigint' ? Number(value) / 100 : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
}

export function formatLargeNumber(value: bigint | number): string {
  const numValue = typeof value === 'bigint' ? Number(value) : value;

  if (numValue >= 1e12) {
    return `${(numValue / 1e12).toFixed(1)}T`;
  } else if (numValue >= 1e9) {
    return `${(numValue / 1e9).toFixed(1)}B`;
  } else if (numValue >= 1e6) {
    return `${(numValue / 1e6).toFixed(1)}M`;
  } else if (numValue >= 1e3) {
    return `${(numValue / 1e3).toFixed(1)}K`;
  }

  return numValue.toString();
}

// Date utilities
export function formatDate(date: Date | string, formatStr = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return 'Invalid Date';
  }

  return format(dateObj, formatStr);
}

export function getQuarterFromDate(date: Date): { year: number; quarter: number } {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const year = date.getFullYear();

  if (month <= 3) return { year, quarter: 1 };
  if (month <= 6) return { year, quarter: 2 };
  if (month <= 9) return { year, quarter: 3 };
  return { year, quarter: 4 };
}

export function getQuarterEndDate(year: number, quarter: number): Date {
  const month = quarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
  return new Date(year, month, 0); // First day of next quarter minus 1 day
}

// Percentage utilities
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculatePercentageChange(oldValue: bigint | number, newValue: bigint | number): number {
  const oldNum = typeof oldValue === 'bigint' ? Number(oldValue) : oldValue;
  const newNum = typeof newValue === 'bigint' ? Number(newValue) : newValue;

  if (oldNum === 0) return newNum > 0 ? 100 : 0;

  return ((newNum - oldNum) / oldNum) * 100;
}

// Validation utilities
export function isValidCUSIP(cusip: string): boolean {
  // CUSIP should be 9 characters: 8 alphanumeric + 1 check digit
  return /^[0-9A-Z]{8}[0-9]$/.test(cusip);
}

export function isValidCIK(cik: string): boolean {
  // CIK should be numeric and up to 10 digits
  return /^\d{1,10}$/.test(cik);
}

// Array utilities
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => string | number | Date,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Error handling utilities
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleAsyncError<T>(
  promise: Promise<T>
): Promise<[Error | null, T | null]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[Error, null]>((error: Error) => [error, null]);
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
