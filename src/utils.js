/**
 * KG-VERTEX PLM — Shared Security & Utility Helpers
 * Import from: import { esc, devLog, getSafeError } from '../utils.js';
 */

/**
 * HTML-escape a value before rendering into innerHTML.
 * Prevents XSS when displaying API-returned data in template literals.
 * Usage: container.innerHTML = `<td>${esc(p.name)}</td>`;
 */
export function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Development-only logger. No-ops in production to prevent
 * internal details leaking to browser DevTools.
 */
export const devLog = import.meta.env?.DEV
  ? console.error.bind(console)
  : () => {};

/**
 * Map raw API error messages to safe, user-friendly strings.
 * Prevents internal server detail leakage in UI toast notifications.
 */
const SAFE_ERROR_MAP = {
  'Failed to create part': 'Unable to save the part. Please check your input and try again.',
  'Part creation failed (403)': 'You do not have permission to create parts.',
  'Part creation failed (400)': 'Some required fields are missing or invalid.',
  'Part update failed (403)': 'You do not have permission to update this part.',
  'Part update failed (400)': 'Some required fields are missing or invalid.',
  'BOM creation failed (400)': 'Please fill all required BOM fields.',
  'BOM creation failed (403)': 'You do not have permission to create BOMs.',
};

export function getSafeError(err, fallback = 'An unexpected error occurred. Please try again.') {
  if (!err) return fallback;
  const msg = err instanceof Error ? err.message : String(err);
  return SAFE_ERROR_MAP[msg] ?? fallback;
}
