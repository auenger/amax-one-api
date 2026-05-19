import { useState, useEffect, useCallback, useRef } from 'react';
import { API } from 'utils/api';

/**
 * Default refresh interval in milliseconds (30 seconds).
 */
const DEFAULT_REFRESH_INTERVAL = 30000;

/**
 * Hook for fetching and auto-refreshing model concurrency data.
 * Provides non-blocking async loading with configurable auto-refresh.
 *
 * @param {object} [options]
 * @param {number} [options.refreshInterval=30000] - Auto-refresh interval in ms. Set to 0 to disable.
 * @param {boolean} [options.enabled=true] - Whether to enable auto-fetching.
 * @returns {{
 *   concurrencyData: Array|null,
 *   loading: boolean,
 *   error: Error|null,
 *   refresh: () => void,
 *   lastFetchedAt: number|null
 * }}
 *
 * @example
 * const { concurrencyData, loading, refresh } = useConcurrencyData({ refreshInterval: 30000 });
 */
const useConcurrencyData = ({ refreshInterval = DEFAULT_REFRESH_INTERVAL, enabled = true } = {}) => {
  const [concurrencyData, setConcurrencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchConcurrency = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/api/user/model_concurrency');
      const { success, data } = res.data;
      if (!mountedRef.current) return;
      if (success && Array.isArray(data)) {
        setConcurrencyData(data);
        setLastFetchedAt(Date.now());
      } else {
        // API returned unsuccessful — keep previous data, don't clear
        if (concurrencyData === null) {
          setConcurrencyData([]);
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      // Silently fail — concurrency data is optional/non-critical
      setError(err);
      if (concurrencyData === null) {
        setConcurrencyData([]);
      }
    }
    if (mountedRef.current) {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) return;

    // Initial fetch
    fetchConcurrency();

    // Set up auto-refresh interval
    if (refreshInterval > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        fetchConcurrency();
      }, refreshInterval);
    }

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fetchConcurrency, refreshInterval, enabled]);

  return {
    concurrencyData,
    loading,
    error,
    refresh: fetchConcurrency,
    lastFetchedAt
  };
};

export default useConcurrencyData;
