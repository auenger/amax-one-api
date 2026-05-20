import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Skeleton,
  InputAdornment,
  Fade,
  IconButton,
  Tooltip,
  LinearProgress,
  Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { API } from 'utils/api';
import { showError, showSuccess, copy } from 'utils/common';
import { getLoadLevel, getLoadColor, buildConcurrencyMap, getTotalConcurrency } from 'utils/concurrency';
import { getQuotaColor, formatRemaining } from 'utils/quota';
import useConcurrencyData from 'hooks/useConcurrencyData';
import {
  IconSearch,
  IconSparkles,
  IconServer,
  IconCopy,
  IconChevronDown,
  IconChevronRight,
  IconLoader
} from '@tabler/icons-react';

// Channel type ID -> label mapping
const CHANNEL_TYPE_MAP = {
  1: 'OpenAI',
  3: 'Azure',
  8: 'Custom',
  14: 'Anthropic',
  15: 'Baidu',
  17: 'Ali',
  18: 'Xunfei',
  24: 'Google Gemini',
  33: 'AWS Claude',
  34: 'Cohere',
  40: 'Moonshot',
  41: 'Baichuan',
  42: 'Minimax',
  43: 'Mistral',
  16: 'Zhipu'
};

// Channel type ID -> color for Chip
const CHANNEL_COLOR_MAP = {
  1: 'success',
  3: 'info',
  14: 'secondary',
  24: 'warning',
  15: 'primary',
  17: 'info',
  40: 'default',
  43: 'primary',
  45: 'info'
};

// Channel status display
const CHANNEL_STATUS_MAP = {
  0: { label: '未知', color: 'default' },
  1: { label: '正常', color: 'success' },
  2: { label: '已禁用', color: 'error' },
  3: { label: '自动禁用', color: 'error' }
};

// Guess channel type from model name prefix (fallback when no channel data)
const guessChannelType = (modelName) => {
  const lower = modelName.toLowerCase();
  if (lower.startsWith('gpt-') || lower.startsWith('o1') || lower.startsWith('o3') || lower.startsWith('chatgpt') || lower.startsWith('dall-e') || lower.startsWith('text-') || lower.startsWith('whisper') || lower.startsWith('tts')) return 'OpenAI';
  if (lower.startsWith('claude-')) return 'Anthropic';
  if (lower.startsWith('gemini-')) return 'Google Gemini';
  if (lower.startsWith('ernie-') || lower.startsWith('wenxin')) return 'Baidu';
  if (lower.startsWith('qwen-') || lower.startsWith('qwen2')) return 'Ali';
  if (lower.startsWith('moonshot') || lower.startsWith('kimi')) return 'Moonshot';
  if (lower.startsWith('baichuan')) return 'Baichuan';
  if (lower.startsWith('minimax')) return 'Minimax';
  if (lower.startsWith('mistral') || lower.startsWith('codestral') || lower.startsWith('pixtral')) return 'Mistral';
  if (lower.startsWith('glm-') || lower.startsWith('chatglm') || lower.startsWith('cogview')) return 'Zhipu';
  if (lower.startsWith('embedding-') || lower.startsWith('text-embedding')) return 'OpenAI';
  return 'Other';
};

// Map channel type label to a chip color (for fallback mode)
function getChipColor(channelType, theme) {
  const colorMap = {
    OpenAI: 'success',
    Anthropic: 'secondary',
    'Google Gemini': 'warning',
    Baidu: 'primary',
    Ali: 'info',
    Moonshot: 'default',
    Mistral: 'primary',
    Zhipu: 'info'
  };
  return colorMap[channelType] || 'default';
}

// NOTE: Concurrency color/label functions moved to utils/concurrency.js (getLoadLevel, getLoadColor, getLoadLabel)
// NOTE: Quota color and formatRemaining moved to utils/quota.js

// ==============================|| QUOTA PROGRESS BAR ||============================== //

const QuotaProgressBar = ({ windows, theme }) => {
  if (!windows || windows.length === 0) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      {windows.map((w, idx) => (
        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: idx < windows.length - 1 ? 0.5 : 0 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(w.used_percent, 100)}
            color={getQuotaColor(w.used_percent)}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', minWidth: 60 }}>
            {w.used_percent.toFixed(0)}% · {w.label}
            {w.remaining_ms > 0 && ` 剩余 ${formatRemaining(w.remaining_ms)}`}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

// ==============================|| CHANNEL ROW (expanded) ||============================== //

const ChannelRow = ({ channel, concurrency, quota, onCopyToken, hasToken, theme }) => {
  const typeLabel = CHANNEL_TYPE_MAP[channel.type] || `Type ${channel.type}`;
  const statusInfo = CHANNEL_STATUS_MAP[channel.status] || CHANNEL_STATUS_MAP[0];
  const concCount = concurrency?.count || 0;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        mb: 1,
        '&:last-child': { mb: 0 }
      }}
    >
      {/* Channel header: name + chips + copy button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
            {channel.name || typeLabel}
          </Typography>
          <Chip label={`ID:${channel.id}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
          <Chip label={typeLabel} size="small" color={CHANNEL_COLOR_MAP[channel.type] || 'default'} variant="outlined" sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
          <Chip label={statusInfo.label} size="small" color={statusInfo.color} variant="filled" sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
        </Box>
        <Tooltip title={hasToken ? '复制带渠道的令牌' : '请先创建令牌'} arrow>
          <IconButton size="small" onClick={() => onCopyToken(channel.id)} sx={{ color: hasToken ? theme.palette.primary.main : theme.palette.text.disabled }}>
            <IconCopy size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Concurrency indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
          并发: {concCount}
        </Typography>
        <Chip
          label={getLoadLevel(concCount).label}
          size="small"
          color={getLoadColor(concCount)}
          sx={{ fontSize: '0.6rem', height: 16, '& .MuiChip-label': { px: 0.5 } }}
        />
      </Box>

      {/* Quota progress bars */}
      {quota && quota.windows && quota.windows.length > 0 && (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem', mr: 1 }}>
            配额:
          </Typography>
          <QuotaProgressBar windows={quota.windows} theme={theme} />
        </Box>
      )}

      {/* Balance display if available */}
      {quota && quota.balance != null && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.text.secondary, fontSize: '0.65rem' }}>
          余额: {quota.balance.toFixed(2)} {quota.balance_unit || ''}
        </Typography>
      )}
    </Box>
  );
};

// ==============================|| MODEL CARD (accordion) ||============================== //

const ModelCard = ({ model, userTokens, concurrencyData, quotaData, theme }) => {
  const [expanded, setExpanded] = useState(false);
  const channels = model.channels || [];
  const firstToken = userTokens && userTokens.length > 0 ? userTokens.find((t) => t.status === 1) : null;

  // Build concurrency map for this model: channelId -> count
  const allConcurrencyMap = useMemo(() => buildConcurrencyMap(concurrencyData), [concurrencyData]);
  const modelConcurrency = allConcurrencyMap[model.name] || {};

  // Summary stats
  const totalConcurrency = useMemo(() => getTotalConcurrency(modelConcurrency), [modelConcurrency]);

  const maxQuotaPercent = useMemo(() => {
    let max = 0;
    channels.forEach((ch) => {
      const q = quotaData?.[ch.id];
      if (q && q.windows) {
        q.windows.forEach((w) => {
          if (w.used_percent > max) max = w.used_percent;
        });
      }
    });
    return max;
  }, [channels, quotaData]);

  const handleCopyToken = useCallback(
    (channelId) => {
      if (!firstToken) {
        showError('没有可用的令牌，请先创建令牌');
        return;
      }
      const tokenWithChannel = `sk-${firstToken.key}-${channelId}`;
      copy(tokenWithChannel, '带渠道令牌');
      showSuccess('已复制令牌到剪贴板');
    },
    [firstToken]
  );

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        borderColor: expanded ? theme.palette.primary.main : undefined,
        boxShadow: expanded ? `0 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.12)' : 'rgba(33,150,243,0.12)'}` : undefined,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default,
        overflow: 'hidden'
      }}
    >
      {/* Collapsed header - always visible */}
      <CardContent
        onClick={() => setExpanded(!expanded)}
        sx={{
          p: 2,
          '&:last-child': { pb: 2 },
          cursor: 'pointer',
          '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            {expanded ? <IconChevronDown size={18} color={theme.palette.primary.main} /> : <IconChevronRight size={18} color={theme.palette.text.secondary} />}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {model.name}
            </Typography>
            <Chip
              label={model.channelType}
              size="small"
              color={getChipColor(model.channelType, theme)}
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 0.75 }, flexShrink: 0 }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, ml: 1 }}>
            {channels.length > 0 && (
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                <IconServer size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                {channels.length} 渠道
              </Typography>
            )}
            {totalConcurrency > 0 && (
              <Chip label={`并发 ${totalConcurrency}`} size="small" color={getLoadColor(totalConcurrency)} variant="filled" sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
            )}
            {maxQuotaPercent > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 80 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(maxQuotaPercent, 100)}
                  color={getQuotaColor(maxQuotaPercent)}
                  sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.palette.text.secondary }}>
                  {maxQuotaPercent.toFixed(0)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>

      {/* Expanded content */}
      <Collapse in={expanded} timeout={300}>
        <Box
          sx={{
            px: 2,
            pb: 2,
            borderTop: `1px solid ${theme.palette.divider}`
          }}
        >
          {/* Copy format hint */}
          {firstToken && channels.length > 0 && (
            <Box
              sx={{
                mb: 1.5,
                mt: 1.5,
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.08)' : 'rgba(33,150,243,0.06)',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.15)' : 'rgba(33,150,243,0.12)'}`
              }}
            >
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                复制格式: <strong>sk-{'{'}令牌{'}'}-{'{'}渠道ID{'}'}</strong>
              </Typography>
            </Box>
          )}

          {/* Channel list */}
          {channels.length > 0 ? (
            channels.map((ch, idx) => (
              <ChannelRow
                key={idx}
                channel={ch}
                concurrency={modelConcurrency[ch.id]}
                quota={quotaData?.[ch.id]}
                onCopyToken={handleCopyToken}
                hasToken={!!firstToken}
                theme={theme}
              />
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 2, color: theme.palette.text.secondary, opacity: 0.6 }}>
              <IconServer size={24} stroke={1} />
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                暂无渠道信息
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
};

// ==============================|| MODEL MARKETPLACE ||============================== //

const ModelMarket = () => {
  const theme = useTheme();
  const [isLoading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [userTokens, setUserTokens] = useState([]);
  const [quotaData, setQuotaData] = useState(null);

  // Use the shared concurrency data hook with 30s auto-refresh
  const { concurrencyData, loading: concurrencyLoading } = useConcurrencyData({ refreshInterval: 30000 });

  // Load models with channel info (primary data)
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, channelRes, tokensRes] = await Promise.allSettled([
        API.get('/api/user/available_models'),
        API.get('/api/user/model_channels'),
        API.get('/api/token/?p=0')
      ]);

      let availableModels = [];
      if (userRes.status === 'fulfilled') {
        const { success, data } = userRes.value.data;
        if (success && data) {
          availableModels = Array.isArray(data) ? data : [];
        }
      }

      let realChannelMap = {};
      if (channelRes.status === 'fulfilled') {
        const { success, data } = channelRes.value.data;
        if (success && data && typeof data === 'object') {
          realChannelMap = data;
        }
      }

      if (tokensRes.status === 'fulfilled') {
        const { success, data } = tokensRes.value.data;
        if (success && Array.isArray(data)) {
          setUserTokens(data);
        }
      }

      if (availableModels.length > 0) {
        setModels(
          availableModels.map((name) => {
            const channels = realChannelMap[name] || [];
            return {
              name,
              channelType: channels.length > 0 ? CHANNEL_TYPE_MAP[channels[0].type] || guessChannelType(name) : guessChannelType(name),
              channels
            };
          })
        );
      } else if (Object.keys(realChannelMap).length > 0) {
        const modelList = [];
        const seen = new Set();
        Object.entries(realChannelMap).forEach(([name, channels]) => {
          if (!seen.has(name) && Array.isArray(channels)) {
            seen.add(name);
            modelList.push({
              name,
              channelType: channels.length > 0 ? CHANNEL_TYPE_MAP[channels[0].type] || guessChannelType(name) : guessChannelType(name),
              channels
            });
          }
        });
        setModels(modelList);
      } else {
        setModels([]);
      }
    } catch (err) {
      showError(err);
      setModels([]);
    }
    setLoading(false);
  }, []);

  // Load quota data (async, non-blocking)
  const loadQuotaData = useCallback(async () => {
    try {
      const quotaRes = await API.get('/api/user/channel_quotas');
      const { success, data } = quotaRes.data;
      if (success && data && typeof data === 'object') {
        setQuotaData(data);
      }
    } catch (err) {
      // Silently fail - quota data is optional
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadModels().then(() => {
      // Load quota data asynchronously after main data is rendered
      loadQuotaData();
    });
  }, [loadModels, loadQuotaData]);

  // Available channel types for filter
  const channelTypes = useMemo(() => {
    const types = new Set(models.map((m) => m.channelType));
    return ['all', ...Array.from(types).sort()];
  }, [models]);

  // Filtered models
  const filteredModels = useMemo(() => {
    let result = models;
    if (channelFilter !== 'all') {
      result = result.filter((m) => m.channelType === channelFilter);
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(keyword));
    }
    return result;
  }, [models, channelFilter, searchKeyword]);

  // Count by channel type
  const channelCounts = useMemo(() => {
    const counts = {};
    models.forEach((m) => {
      counts[m.channelType] = (counts[m.channelType] || 0) + 1;
    });
    return counts;
  }, [models]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <IconSparkles size={28} color={theme.palette.primary.main} />
        <Typography variant="h3" sx={{ fontWeight: 600 }}>
          模型广场
        </Typography>
        <Chip label={`${models.length} 个模型`} size="small" color="primary" variant="outlined" />
        {concurrencyLoading && (
          <Tooltip title="正在刷新并发和配额数据..." arrow>
            <IconLoader size={16} className="spin" style={{ color: theme.palette.text.secondary, animation: 'spin 1s linear infinite' }} />
          </Tooltip>
        )}
      </Box>

      {/* Search & Filter Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="搜索模型名称..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ flex: '1 1 240px', maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} />
              </InputAdornment>
            )
          }}
        />
        <FormControl size="small" sx={{ flex: '0 1 200px' }}>
          <InputLabel>渠道类型</InputLabel>
          <Select value={channelFilter} label="渠道类型" onChange={(e) => setChannelFilter(e.target.value)}>
            {channelTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type === 'all' ? '全部' : type}
                {type !== 'all' && channelCounts[type] ? ` (${channelCounts[type]})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Array.from(new Array(8)).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && filteredModels.length === 0 && (
        <Fade in>
          <Box sx={{ textAlign: 'center', py: 8, color: theme.palette.text.secondary }}>
            <IconSparkles size={48} stroke={1} style={{ opacity: 0.3 }} />
            <Typography variant="h5" sx={{ mt: 2, opacity: 0.6 }}>
              {models.length === 0 ? '暂无可用模型' : '没有匹配的模型'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.4 }}>
              {models.length === 0 ? '请联系管理员配置模型渠道' : '请尝试调整搜索关键词或筛选条件'}
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Model Cards - flat list layout */}
      {!isLoading && filteredModels.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredModels.map((model, index) => (
            <Fade in key={`${model.name}-${index}`} timeout={{ enter: Math.min(index * 50, 500) }}>
              <div>
                <ModelCard
                  model={model}
                  userTokens={userTokens}
                  concurrencyData={concurrencyData}
                  quotaData={quotaData}
                  theme={theme}
                />
              </div>
            </Fade>
          ))}
        </Box>
      )}

      {/* Spin animation for refresh indicator */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default ModelMarket;
