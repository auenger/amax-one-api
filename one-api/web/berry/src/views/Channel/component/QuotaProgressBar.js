import PropTypes from 'prop-types';
import { Box, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getQuotaColor, formatRemaining } from 'utils/quota';

/**
 * QuotaProgressBar - displays quota usage as progress bars.
 *
 * Modes:
 * - "compact": smaller text, for table cells
 * - "standard": normal size, for detail cards
 *
 * Props:
 * - windows: array of { label, used_percent, remaining_ms }
 * - mode: "compact" | "standard"
 */
export default function QuotaProgressBar({ windows, mode = 'standard' }) {
  const theme = useTheme();

  if (!windows || windows.length === 0) return null;

  const isCompact = mode === 'compact';

  return (
    <Box>
      {windows.map((w, idx) => (
        <Box
          key={idx}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: isCompact ? 0.5 : 1,
            mb: idx < windows.length - 1 ? (isCompact ? 0.25 : 0.5) : 0
          }}
        >
          <LinearProgress
            variant="determinate"
            value={Math.min(w.used_percent, 100)}
            color={getQuotaColor(w.used_percent)}
            sx={{
              flex: 1,
              height: isCompact ? 4 : 6,
              borderRadius: isCompact ? 2 : 3,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontSize: isCompact ? '0.6rem' : '0.65rem',
              color: theme.palette.text.secondary,
              whiteSpace: 'nowrap',
              minWidth: isCompact ? 50 : 60
            }}
          >
            {w.used_percent.toFixed(0)}% {w.label}
            {w.remaining_ms > 0 && ` ${formatRemaining(w.remaining_ms)}`}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

QuotaProgressBar.propTypes = {
  windows: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      used_percent: PropTypes.number.isRequired,
      remaining_ms: PropTypes.number
    })
  ),
  mode: PropTypes.oneOf(['compact', 'standard'])
};
