import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import QuotaProgressBar from './QuotaProgressBar';
import { formatBalance } from 'utils/quota';

/**
 * ChannelQuotaCell - compact quota display for the Channel list table.
 *
 * Shows:
 * - Progress bars for window-type quotas
 * - Balance for balance-type channels
 * - "-" for channels with no quota data
 */
export default function ChannelQuotaCell({ quota }) {
  const theme = useTheme();

  // No quota data
  if (!quota) {
    return <span style={{ color: theme.palette.text.disabled }}>-</span>;
  }

  // Query error
  if (quota.query_error && (!quota.windows || quota.windows.length === 0) && quota.balance == null) {
    return (
      <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: '0.7rem' }}>
        不支持
      </Typography>
    );
  }

  return (
    <Box sx={{ minWidth: 120 }}>
      {/* Window-based quota */}
      {quota.windows && quota.windows.length > 0 && (
        <QuotaProgressBar windows={quota.windows} mode="compact" />
      )}
      {/* Balance-based quota */}
      {quota.balance != null && (
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem', display: 'block', mt: quota.windows?.length > 0 ? 0.25 : 0 }}>
          余额: {formatBalance(quota.balance, quota.balance_unit)}
        </Typography>
      )}
    </Box>
  );
}

ChannelQuotaCell.propTypes = {
  quota: PropTypes.shape({
    account_level: PropTypes.string,
    balance: PropTypes.number,
    balance_unit: PropTypes.string,
    windows: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        used_percent: PropTypes.number,
        remaining_ms: PropTypes.number
      })
    ),
    last_updated: PropTypes.number,
    query_error: PropTypes.string
  })
};
