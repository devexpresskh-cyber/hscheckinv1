/**
 * Utility functions for phone number normalization and matching
 * specifically tailored for Cambodian phone numbers (+855 / 0xx) and international numbers.
 */

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

/**
 * Strips Cambodia country prefix (855) or local trunk prefix (0)
 * to get the core subscriber digits.
 */
export function getCorePhoneDigits(phone: string): string {
  const digits = normalizePhoneNumber(phone);
  if (digits.startsWith('855')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * Formats a phone number for user-friendly display in Cambodian standard (+855 xx xxx xxx)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = normalizePhoneNumber(phone);
  if (digits.startsWith('855') && digits.length >= 11) {
    const local = digits.slice(3);
    return `+855 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Checks whether an input phone matches a stored phone.
 * Supports:
 * - "012 345 678" vs "+855 12 345 678"
 * - "012345678" vs "+85512345678"
 * - "12345678" vs "+855 12 345 678"
 * - "092 888 777" vs "+855 92 888 777"
 */
export function phoneNumbersMatch(input: string, stored?: string): boolean {
  if (!input || !stored) return false;
  const cleanInput = normalizePhoneNumber(input);
  const cleanStored = normalizePhoneNumber(stored);
  if (!cleanInput || !cleanStored) return false;

  if (cleanInput === cleanStored) return true;

  const coreInput = getCorePhoneDigits(cleanInput);
  const coreStored = getCorePhoneDigits(cleanStored);

  if (coreInput.length >= 7 && coreInput === coreStored) {
    return true;
  }

  if (coreInput.length >= 7 && (cleanStored.endsWith(coreInput) || cleanInput.endsWith(coreStored))) {
    return true;
  }

  return false;
}
