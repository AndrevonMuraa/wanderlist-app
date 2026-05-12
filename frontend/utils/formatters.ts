/**
 * Compact number formatter — prevents text wrapping in narrow card containers.
 * 1500 → "1.5K", 2_300_000 → "2.3M", 0–999 stays as-is.
 *
 * Uses Intl.NumberFormat with `notation: 'compact'` (well-supported on Hermes/iOS 14+).
 * Falls back to `toLocaleString()` on platforms that don't support compact notation.
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  const n = Number(value);
  if (Math.abs(n) < 1000) return n.toString();
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return n.toLocaleString();
  }
}

/**
 * Full locale-aware number formatter for hover/tooltip details.
 * 1500 → "1,500"
 */
export function formatFullNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return Number(value).toLocaleString();
}
