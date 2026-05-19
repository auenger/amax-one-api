/**
 * Concurrency utility functions for load level calculation and color mapping.
 * Shared across Model Market, Channel management, and other consumers.
 *
 * Thresholds are configurable via CONCURRENCY_THRESHOLDS.
 */

/**
 * Configurable thresholds for load levels.
 * Each level defines an upper bound (inclusive) for that category.
 * Order matters: levels are evaluated from lowest to highest.
 */
export const CONCURRENCY_THRESHOLDS = {
  low: { max: 2, label: '低负载', color: 'success' },
  medium: { max: 5, label: '中负载', color: 'warning' },
  high: { max: Infinity, label: '高负载', color: 'error' }
};

/**
 * Calculate the load level for a given concurrency count.
 * Returns an object with { level, label, color }.
 *
 * @param {number} count - Current concurrency count
 * @param {object} [thresholds] - Optional custom thresholds (same shape as CONCURRENCY_THRESHOLDS)
 * @returns {{ level: string, label: string, color: string }}
 */
export function getLoadLevel(count, thresholds) {
  const t = thresholds || CONCURRENCY_THRESHOLDS;

  if (count === 0) {
    return { level: 'idle', label: '空闲', color: t.low.color };
  }
  if (count <= t.low.max) {
    return { level: 'low', label: t.low.label, color: t.low.color };
  }
  if (count <= t.medium.max) {
    return { level: 'medium', label: t.medium.label, color: t.medium.color };
  }
  return { level: 'high', label: t.high.label, color: t.high.color };
}

/**
 * Get the MUI chip color for a concurrency count.
 * Convenience wrapper around getLoadLevel that returns just the color string.
 *
 * @param {number} count - Current concurrency count
 * @returns {string} MUI color name: 'success' | 'warning' | 'error'
 */
export function getLoadColor(count) {
  return getLoadLevel(count).color;
}

/**
 * Get the display label for a concurrency count.
 * Convenience wrapper around getLoadLevel that returns just the label.
 *
 * @param {number} count - Current concurrency count
 * @returns {string} Load level label
 */
export function getLoadLabel(count) {
  return getLoadLevel(count).label;
}

/**
 * Build a concurrency map from the API response data.
 * Returns a map of model name -> { channelId: ConcurrencyDetail }.
 *
 * @param {Array<{model: string, items: Array<{channel_id: number, count: number}>}>} concurrencyData
 * @returns {Object<string, Object<number, object>>}
 */
export function buildConcurrencyMap(concurrencyData) {
  const map = {};
  if (!concurrencyData || !Array.isArray(concurrencyData)) return map;

  concurrencyData.forEach((entry) => {
    const items = {};
    if (entry.items && Array.isArray(entry.items)) {
      entry.items.forEach((item) => {
        items[item.channel_id] = item;
      });
    }
    map[entry.model] = items;
  });
  return map;
}

/**
 * Calculate total concurrency across all channels for a model.
 *
 * @param {Object<number, {count: number}>} modelConcurrency - channelId -> concurrency detail
 * @returns {number}
 */
export function getTotalConcurrency(modelConcurrency) {
  if (!modelConcurrency) return 0;
  return Object.values(modelConcurrency).reduce((sum, item) => sum + (item.count || 0), 0);
}
