import PropTypes from 'prop-types';
import { useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconRefresh } from '@tabler/icons-react';
import QuotaProgressBar from './QuotaProgressBar';
import { formatBalance, formatRemaining } from 'utils/quota';
import { API } from 'utils/api';
import { showError, showSuccess } from 'utils/common';

/**
 * ChannelQuotaCard - full quota display for Channel detail / edit modal.
 *
 * Shows:
 * - Account level chip
 * - All window progress bars with percentage + remaining time
 * - Balance amount for balance-type channels
 * - Manual refresh button
 * - Last updated timestamp
 */
export default function ChannelQuotaCard({ channelId, quota: initialQuota }) {
  const theme = useTheme();
  const [quota, setQuota] = useState(initialQuota);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await API.post(`/api/channel/${channelId}/quota/refresh`);
      const { success, message, data } = res.data;
      if (success) {
        setQuota(data);
        showSuccess('配额数据已刷新');
      } else {
        showError(message || '刷新失败');
      }
    } catch (err) {
      showError(err.message || '刷新请求失败');
    }
    setRefreshing(false);
  };

  // No quota data at all
  if (!quota) {
    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>
              配额信息
            </Typography>
            <Tooltip title="刷新配额" arrow>
              <span>
                <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.disabled, fontSize: '0.8rem' }}>
            暂无配额数据
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Query error and no useful data
  if (quota.query_error && (!quota.windows || quota.windows.length === 0) && quota.balance == null) {
    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>
              配额信息
            </Typography>
            <Tooltip title="刷新配额" arrow>
              <span>
                <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.disabled, fontSize: '0.8rem' }}>
            {quota.query_error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const lastUpdated = quota.last_updated
    ? new Date(quota.last_updated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '-';

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2">配额信息</Typography>
            {quota.account_level && (
              <Chip
                label={quota.account_level}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 0.75 } }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: '0.65rem' }}>
              更新于 {lastUpdated}
            </Typography>
            <Tooltip title="刷新配额" arrow>
              <span>
                <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Window-based quota bars */}
        {quota.windows && quota.windows.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {quota.windows.map((w, idx) => (
              <Box key={idx} sx={{ mb: idx < quota.windows.length - 1 ? 1 : 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                    {w.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                    {w.used_percent.toFixed(1)}%
                    {w.remaining_ms > 0 && ` · 剩余 ${formatRemaining(w.remaining_ms)}`}
                  </Typography>
                </Box>
                <QuotaProgressBar windows={[w]} mode="standard" />
              </Box>
            ))}
          </Box>
        )}

        {/* Balance display */}
        {quota.balance != null && (
          <Box sx={{ mt: quota.windows?.length > 0 ? 1 : 0, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}>
              余额:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {formatBalance(quota.balance, quota.balance_unit)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

ChannelQuotaCard.propTypes = {
  channelId: PropTypes.number.isRequired,
  quota: PropTypes.shape({
    account_level: PropTypes.string,
    balance: PropTypes.number,
    balance_unit: PropTypes.string,
    windows: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        used_percent: PropTypes.number,
        remaining_ms: PropTypes.number,
        reset_at: PropTypes.number
      })
    ),
    last_updated: PropTypes.number,
    query_error: PropTypes.string
  })
};
