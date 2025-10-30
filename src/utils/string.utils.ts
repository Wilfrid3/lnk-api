/**
 * Safely converts a value to string, handling null/undefined
 * @param value Any value that needs to be converted to string
 * @returns String representation or empty string if null/undefined
 */
export const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};
