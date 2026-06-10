/**
 * Quota utility functions shared between Channel management and Model Market.
 */

/**
 * Get quota progress bar color based on usage percent.
 * Green: 0-60%, Yellow: 60-85%, Red: 85-100%
 */
export function getQuotaColor(percent) {
  if (percent <= 60) return 'success';
  if (percent <= 85) return 'warning';
  return 'error';
}

/**
 * Format remaining time from milliseconds to human-readable string.
 * e.g. "5h", "2d3h", "45m"
 */
export function formatRemaining(ms) {
  if (!ms || ms <= 0) return '';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hours < 24) return `${hours}h${min > 0 ? min + 'm' : ''}`;
  const days = Math.floor(hours / 24);
  const remainH = hours % 24;
  return `${days}d${remainH > 0 ? remainH + 'h' : ''}`;
}

/**
 * Format balance with unit symbol.
 * e.g. "¥10.50", "$5.00"
 */
export function formatBalance(balance, unit) {
  if (balance == null) return '-';
  if (unit === 'CNY' || unit === '¥') return `¥${balance.toFixed(2)}`;
  if (unit === 'USD' || unit === '$') return `$${balance.toFixed(2)}`;
  return `${balance.toFixed(2)} ${unit || ''}`.trim();
}
