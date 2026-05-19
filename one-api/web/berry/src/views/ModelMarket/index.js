import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Skeleton,
  InputAdornment,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Tooltip,
  Stack
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { gridSpacing } from 'store/constant';
import { API } from 'utils/api';
import { showError } from 'utils/common';
import { copy } from 'utils/common';
import {
  IconSearch,
  IconSparkles,
  IconX,
  IconServer,
  IconInfoCircle,
  IconTopologyStarRing3,
  IconChevronRight,
  IconCopy
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
  45: 'Zhipu'
};

// Channel type ID -> color for Chip
const CHANNEL_COLOR_MAP = {
  1: 'success', // OpenAI
  3: 'info', // Azure
  14: 'secondary', // Anthropic
  24: 'warning', // Google Gemini
  15: 'primary', // Baidu
  17: 'info', // Ali
  40: 'default', // Moonshot
  43: 'primary', // Mistral
  45: 'info' // Zhipu
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

// ==============================|| MODEL DETAIL DIALOG ||============================== //

const ModelDetailDialog = ({ open, model, onClose, userTokens }) => {
  const theme = useTheme();

  if (!model) return null;

  const channels = model.channels || [];
  // Get the first enabled token key for copy
  const firstToken = userTokens && userTokens.length > 0 ? userTokens.find((t) => t.status === 1) : null;

  const handleCopyToken = (channelId) => {
    if (!firstToken) {
      showError('没有可用的令牌，请先创建令牌');
      return;
    }
    const tokenWithChannel = `sk-${firstToken.key}-${channelId}`;
    copy(tokenWithChannel, '带渠道令牌');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconSparkles size={22} color={theme.palette.primary.main} />
          <Typography variant="h5" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            模型详情
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: theme.palette.text.secondary }}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Model Name */}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, wordBreak: 'break-all' }}>
          {model.name}
        </Typography>

        {/* Primary Channel Type Badge */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2.5 }}>
          {model.channelType && (
            <Chip
              label={model.channelType}
              size="small"
              color={getChipColor(model.channelType, theme)}
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
          {channels.length > 0 && (
            <Chip
              label={`${channels.length} 个可用渠道`}
              size="small"
              color="primary"
              variant="filled"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
        </Box>

        {/* Copy Hint */}
        {firstToken && channels.length > 0 && (
          <Box
            sx={{
              mb: 2,
              px: 1.5,
              py: 1,
              borderRadius: 1,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.08)' : 'rgba(33,150,243,0.06)',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.15)' : 'rgba(33,150,243,0.12)'}`
            }}
          >
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              点击渠道旁的复制按钮可复制带渠道 ID 的令牌格式：<strong>sk-{'{'}令牌密钥{'}'}-{'{'}渠道ID{'}'}</strong>
            </Typography>
          </Box>
        )}

        {/* Channel List */}
        {channels.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.text.secondary, fontWeight: 600 }}>
              <IconServer size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              可用渠道列表
            </Typography>
            <List
              dense
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: 2,
                py: 0.5
              }}
            >
              {channels.map((ch, idx) => {
                const typeLabel = CHANNEL_TYPE_MAP[ch.type] || `Type ${ch.type}`;
                const statusInfo = CHANNEL_STATUS_MAP[ch.status] || CHANNEL_STATUS_MAP[0];
                return (
                  <ListItem
                    key={idx}
                    secondaryAction={
                      firstToken ? (
                        <Tooltip title="复制带渠道的令牌" arrow>
                          <IconButton edge="end" size="small" onClick={() => handleCopyToken(ch.id)} sx={{ color: theme.palette.primary.main }}>
                            <IconCopy size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : null
                    }
                    sx={{ py: 0.5, pr: firstToken ? 5 : 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <IconTopologyStarRing3 size={16} style={{ color: theme.palette.primary.main }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {ch.name || typeLabel}
                          </Typography>
                          <Chip
                            label={`ID: ${ch.id}`}
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                            variant="outlined"
                          />
                          <Chip
                            label={typeLabel}
                            size="small"
                            color={CHANNEL_COLOR_MAP[ch.type] || 'default'}
                            sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                            variant="outlined"
                          />
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            color={statusInfo.color}
                            sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                            variant="filled"
                          />
                        </Stack>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 3,
              color: theme.palette.text.secondary,
              opacity: 0.6
            }}
          >
            <IconInfoCircle size={32} stroke={1} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              暂无渠道信息
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" size="small">
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| MODEL MARKETPLACE ||============================== //

const ModelMarket = () => {
  const theme = useTheme();
  const [isLoading, setLoading] = useState(true);
  const [models, setModels] = useState([]); // [{name, channelType, channels: [{id, name, type, status}]}]
  const [searchKeyword, setSearchKeyword] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [detailModel, setDetailModel] = useState(null);
  const [userTokens, setUserTokens] = useState([]);

  // Load models with channel info
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user available models, real channel data, and user tokens in parallel
      const [userRes, channelRes, tokensRes] = await Promise.allSettled([
        API.get('/api/user/available_models'),
        API.get('/api/user/model_channels'),
        API.get('/api/token/?p=0')
      ]);

      // Parse user available models
      let availableModels = [];
      if (userRes.status === 'fulfilled') {
        const { success, data } = userRes.value.data;
        if (success && data) {
          availableModels = Array.isArray(data) ? data : [];
        }
      }

      // Parse real channel data: modelName -> [{id, name, type, status}]
      let realChannelMap = {};
      if (channelRes.status === 'fulfilled') {
        const { success, data } = channelRes.value.data;
        if (success && data && typeof data === 'object') {
          realChannelMap = data;
        }
      }

      // Parse user tokens for copy functionality
      if (tokensRes.status === 'fulfilled') {
        const { success, data } = tokensRes.value.data;
        if (success && Array.isArray(data)) {
          setUserTokens(data);
        }
      }

      // Build model list using real channel data
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
        // Fallback: use real channel data directly
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

  useEffect(() => {
    loadModels();
  }, [loadModels]);

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

  // Open detail dialog
  const handleCardClick = (model) => {
    setDetailModel(model);
  };

  const handleCloseDetail = () => {
    setDetailModel(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconSparkles size={28} color={theme.palette.primary.main} />
        <Typography variant="h3" sx={{ fontWeight: 600 }}>
          模型广场
        </Typography>
        <Chip
          label={`${models.length} 个模型`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ ml: 1 }}
        />
      </Box>

      {/* Search & Filter Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            size="small"
            placeholder="搜索模型名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>渠道类型</InputLabel>
            <Select
              value={channelFilter}
              label="渠道类型"
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              {channelTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type === 'all' ? '全部' : type}
                  {type !== 'all' && channelCounts[type] ? ` (${channelCounts[type]})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Loading State */}
      {isLoading && (
        <Grid container spacing={gridSpacing}>
          {Array.from(new Array(12)).map((_, index) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
              <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!isLoading && filteredModels.length === 0 && (
        <Fade in>
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: theme.palette.text.secondary
            }}
          >
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

      {/* Model Card Grid */}
      {!isLoading && filteredModels.length > 0 && (
        <Grid container spacing={gridSpacing}>
          {filteredModels.map((model, index) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={`${model.name}-${index}`}>
              <Fade in timeout={{ enter: Math.min(index * 30, 500) }}>
                <Card
                  variant="outlined"
                  onClick={() => handleCardClick(model)}
                  sx={{
                    height: '100%',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 2px 12px ${theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.15)' : 'rgba(33,150,243,0.15)'}`,
                      transform: 'translateY(-2px)'
                    },
                    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Model Name */}
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        lineHeight: 1.3,
                        mb: 1.5,
                        wordBreak: 'break-all',
                        minHeight: 32,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {model.name}
                    </Typography>

                    {/* Channel Type Badge + Channel Count */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={model.channelType}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          '& .MuiChip-label': { px: 1 }
                        }}
                        color={getChipColor(model.channelType, theme)}
                        variant="outlined"
                      />
                      {model.channels.length > 0 && (
                        <Tooltip title={`${model.channels.length} 个可用渠道`} arrow>
                          <Chip
                            icon={<IconServer size={12} />}
                            label={model.channels.length}
                            size="small"
                            color="primary"
                            variant="filled"
                            sx={{
                              fontSize: '0.6rem',
                              height: 20,
                              '& .MuiChip-label': { px: 0.5 },
                              '& .MuiChip-icon': { ml: 0.5 }
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>

                    {/* Click hint on hover */}
                    <Box
                      sx={{
                        mt: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '.MuiCard-root:hover &': {
                          opacity: 0.5
                        }
                      }}
                    >
                      <IconChevronRight size={14} />
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Model Detail Dialog */}
      <ModelDetailDialog
        open={Boolean(detailModel)}
        model={detailModel}
        onClose={handleCloseDetail}
        userTokens={userTokens}
      />
    </Box>
  );
};

export default ModelMarket;
