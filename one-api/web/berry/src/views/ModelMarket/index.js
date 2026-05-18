import { useState, useEffect, useMemo } from 'react';
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
  Fade
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { gridSpacing } from 'store/constant';
import { API } from 'utils/api';
import { showError } from 'utils/common';
import { IconSearch, IconBrain } from '@tabler/icons-react';

// Channel type name mapping (channel type id -> label)
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

// ==============================|| MODEL MARKETPLACE ||============================== //

const ModelMarket = () => {
  const theme = useTheme();
  const [isLoading, setLoading] = useState(true);
  const [models, setModels] = useState([]); // [{name, channelType}]
  const [searchKeyword, setSearchKeyword] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  // Load models
  const loadModels = async () => {
    setLoading(true);
    try {
      // Try user available models first (works for all roles)
      const res = await API.get('/api/user/available_models');
      const { success, message, data } = res.data;
      if (success && data) {
        // data is an array of model name strings
        const modelList = Array.isArray(data) ? data : [];
        setModels(
          modelList.map((name) => ({
            name,
            channelType: guessChannelType(name)
          }))
        );
      } else {
        showError(message);
      }
    } catch {
      // Fallback: try the full models API
      try {
        const res = await API.get('/api/models');
        const { success, data } = res.data;
        if (success && data) {
          // data is channelId2Models: { channelType: [modelNames] }
          const modelList = [];
          if (typeof data === 'object' && !Array.isArray(data)) {
            Object.entries(data).forEach(([channelType, names]) => {
              const typeLabel = CHANNEL_TYPE_MAP[parseInt(channelType)] || `Type ${channelType}`;
              if (Array.isArray(names)) {
                names.forEach((name) => {
                  modelList.push({ name, channelType: typeLabel });
                });
              }
            });
          }
          setModels(modelList);
        }
      } catch (err) {
        showError(err);
      }
    }
    setLoading(false);
  };

  // Guess channel type from model name prefix
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

  useEffect(() => {
    loadModels();
  }, []);

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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconBrain size={28} color={theme.palette.primary.main} />
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
              <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
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
            <IconBrain size={48} stroke={1} style={{ opacity: 0.3 }} />
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
                  sx={{
                    height: '100%',
                    borderRadius: 2,
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
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

// Map channel type to a chip color
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

export default ModelMarket;
