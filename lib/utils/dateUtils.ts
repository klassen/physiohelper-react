/**
 * Date/Time Utilities for PhysioHelper
 * 
 * 🚨 CRITICAL: Always use local time, NEVER UTC or ISO dates!
 * All dates in the database are stored as local datetime strings (YYYY-MM-DD HH:MM:SS).
 */

/**
 * Get current local datetime as string
 * @returns Local datetime string in format: YYYY-MM-DD HH:MM:SS
 */
export function getLocalDateTime(): string {
  const now = new Date();
  return formatLocalDateTime(now);
}

/**
 * Format a Date object to local datetime string
 * @param date - JavaScript Date object
 * @returns Local datetime string in format: YYYY-MM-DD HH:MM:SS
 */
export function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Parse a local datetime string to Date object
 * @param dateString - Local datetime string in format: YYYY-MM-DD HH:MM:SS
 * @returns JavaScript Date object
 */
export function parseLocalDateTime(dateString: string): Date {
  // Replace space with 'T' and add local timezone indicator
  const isoLike = dateString.replace(' ', 'T');
  return new Date(isoLike);
}

/**
 * Get local date string (without time)
 * @returns Local date string in format: YYYY-MM-DD
 */
export function getLocalDate(): string {
  const now = new Date();
  return formatLocalDate(now);
}

/**
 * Format a Date object to local date string (without time)
 * @param date - JavaScript Date object
 * @returns Local date string in format: YYYY-MM-DD
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format datetime string for display
 * @param dateString - Local datetime string
 * @returns Human-readable date string
 */
export function formatDisplayDate(dateString: string): string {
  const date = parseLocalDateTime(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format datetime string for display with time
 * @param dateString - Local datetime string
 * @returns Human-readable datetime string
 */
export function formatDisplayDateTime(dateString: string): string {
  const date = parseLocalDateTime(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
