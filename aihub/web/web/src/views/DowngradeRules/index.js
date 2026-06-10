import { useState, useEffect, useCallback, useMemo } from 'react';
import { showError, showSuccess } from 'utils/common';
import { API } from 'utils/api';
import AdminContainer from 'ui-component/AdminContainer';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Chip,
  Stack,
  Alert,
  Box,
  Switch,
  FormControlLabel,
  Divider,
  Autocomplete,
  TextField,
  CircularProgress
} from '@mui/material';
import { IconRefresh, IconArrowDown, IconDeviceFloppy } from '@tabler/icons-react';
import { CHANNEL_OPTIONS } from 'constants/ChannelConstants';

const getProviderName = (type) => {
  return CHANNEL_OPTIONS[type]?.text || `Unknown (${type})`;
};

export default function DowngradeRules() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allChannels, setAllChannels] = useState([]);
  const [fallback, setFallback] = useState({
    FallbackEnabled: 'false',
    FallbackChannelId: '',
    FallbackModel: ''
  });
  const [fallbackLoading, setFallbackLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/downgrade/status');
      const { success, data, message } = res.data;
      if (success) {
        setChannels(data || []);
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
    setLoading(false);
  }, []);

  const loadAllChannels = useCallback(async () => {
    try {
      const all = [];
      let page = 0;
      while (true) {
        const res = await API.get(`/api/channel/?p=${page}`);
        const { success, data, message } = res.data;
        if (!success) {
          showError(message);
          break;
        }
        if (data && data.length > 0) {
          all.push(...data);
        }
        if (!data || data.length < 100) break;
        page++;
      }
      setAllChannels(all);
    } catch (e) {
      showError(e.message);
    }
  }, []);

  const loadFallbackOptions = useCallback(async () => {
    try {
      const res = await API.get('/api/option/');
      const { success, data, message } = res.data;
      if (success) {
        const opts = {};
        data.forEach((item) => {
          if (['FallbackEnabled', 'FallbackChannelId', 'FallbackModel'].includes(item.key)) {
            opts[item.key] = item.value;
          }
        });
        setFallback((prev) => ({ ...prev, ...opts }));
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadFallbackOptions();
    loadAllChannels();
  }, [loadData, loadFallbackOptions, loadAllChannels]);

  const activeCount = channels.filter((c) => c.is_active).length;
  const fallbackEnabled = fallback.FallbackEnabled === 'true';

  const handleFallbackToggle = async () => {
    const newValue = fallbackEnabled ? 'false' : 'true';
    setFallbackLoading(true);
    try {
      const res = await API.put('/api/option/', { key: 'FallbackEnabled', value: newValue });
      const { success, message } = res.data;
      if (success) {
        setFallback((prev) => ({ ...prev, FallbackEnabled: newValue }));
        showSuccess(newValue === 'true' ? '兜底模型已启用' : '兜底模型已禁用');
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
    setFallbackLoading(false);
  };

  const selectedChannel = useMemo(() => {
    if (!fallback.FallbackChannelId || fallback.FallbackChannelId === '0') return null;
    const id = parseInt(fallback.FallbackChannelId, 10);
    return allChannels.find((ch) => ch.id === id) || null;
  }, [fallback.FallbackChannelId, allChannels]);

  const channelModels = useMemo(() => {
    if (!selectedChannel || !selectedChannel.models) return [];
    if (Array.isArray(selectedChannel.models)) return selectedChannel.models;
    return selectedChannel.models.split(',').map((m) => m.trim()).filter(Boolean);
  }, [selectedChannel]);

  const handleFallbackSave = async () => {
    if (fallbackEnabled) {
      if (!fallback.FallbackChannelId || fallback.FallbackChannelId === '0') {
        showError('请选择兜底渠道');
        return;
      }
      if (!fallback.FallbackModel) {
        showError('请选择兜底模型');
        return;
      }
    }
    setFallbackLoading(true);
    try {
      const updates = [
        API.put('/api/option/', { key: 'FallbackChannelId', value: fallback.FallbackChannelId || '0' }),
        API.put('/api/option/', { key: 'FallbackModel', value: fallback.FallbackModel || '' })
      ];
      await Promise.all(updates);
      showSuccess('兜底模型配置已保存');
    } catch (e) {
      showError(e.message);
    }
    setFallbackLoading(false);
  };

  return (
    <>
      <AdminContainer>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h3">降级监控</Typography>
          <Button variant="outlined" startIcon={<IconRefresh />} onClick={() => { loadData(); loadFallbackOptions(); loadAllChannels(); }} disabled={loading}>
            刷新
          </Button>
        </Stack>

        {/* Fallback Model Config Card */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6">兜底模型</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={fallbackEnabled}
                    onChange={handleFallbackToggle}
                    disabled={fallbackLoading}
                    color="primary"
                  />
                }
                label={fallbackEnabled ? '已启用' : '未启用'}
              />
            </Stack>
            <Typography variant="body2" color="textSecondary" mb={2}>
              当目标模型的渠道不可用时，自动将请求路由到兜底渠道的兜底模型，保证服务可用性。
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={2} alignItems="flex-start" mb={2}>
              <Autocomplete
                size="small"
                sx={{ width: 280 }}
                options={allChannels}
                getOptionLabel={(option) => `#${option.id} ${option.name}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={selectedChannel}
                onChange={(e, newValue) => {
                  if (newValue) {
                    setFallback((prev) => ({
                      ...prev,
                      FallbackChannelId: String(newValue.id),
                      FallbackModel: ''
                    }));
                  } else {
                    setFallback((prev) => ({
                      ...prev,
                      FallbackChannelId: '',
                      FallbackModel: ''
                    }));
                  }
                }}
                disabled={!fallbackEnabled || fallbackLoading}
                renderInput={(params) => (
                  <TextField {...params} label="选择兜底渠道" placeholder="搜索渠道..." />
                )}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={option.id} {...rest}>
                      <Stack direction="row" spacing={1} alignItems="center" width="100%">
                        <Chip
                          label={getProviderName(option.type)}
                          color={CHANNEL_OPTIONS[option.type]?.color || 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ flexShrink: 0 }}
                        />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          #{option.id} {option.name}
                        </Typography>
                      </Stack>
                    </li>
                  );
                }}
              />
              <Autocomplete
                size="small"
                sx={{ width: 300 }}
                options={channelModels}
                value={fallback.FallbackModel || null}
                onChange={(e, newValue) => {
                  setFallback((prev) => ({ ...prev, FallbackModel: newValue || '' }));
                }}
                disabled={!fallbackEnabled || fallbackLoading || !selectedChannel}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="选择兜底模型"
                    placeholder={selectedChannel ? '搜索模型...' : '请先选择渠道'}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
                freeSolo
              />
              <Button
                variant="contained"
                startIcon={<IconDeviceFloppy />}
                onClick={handleFallbackSave}
                disabled={!fallbackEnabled || fallbackLoading}
                size="small"
                sx={{ mt: 0 }}
              >
                保存
              </Button>
            </Stack>
            {fallbackEnabled && selectedChannel && fallback.FallbackModel && (
              <Alert severity="info" sx={{ mt: 1 }}>
                兜底配置：{getProviderName(selectedChannel.type)} #{selectedChannel.id} {selectedChannel.name} → {fallback.FallbackModel}
              </Alert>
            )}
          </CardContent>
        </Card>

        {activeCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<IconArrowDown size={20} />}>
            当前有 <strong>{activeCount}</strong> 个渠道正在降级：{' '}
            {channels
              .filter((c) => c.is_active)
              .map((c) => (
                <Chip
                  key={c.channel_id}
                  label={`#${c.channel_id} ${c.channel_name} → ${c.active_model}`}
                  color="warning"
                  size="small"
                  sx={{ mr: 1, mb: 0.5 }}
                />
              ))}
          </Alert>
        )}

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>渠道 ID</TableCell>
                  <TableCell>渠道名称</TableCell>
                  <TableCell>供应商</TableCell>
                  <TableCell>降级阈值 (%)</TableCell>
                  <TableCell>目标模型</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary" py={4}>
                        暂无配置降级的渠道，请在渠道编辑页面中配置降级参数
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  channels.map((ch) => (
                    <TableRow key={ch.channel_id}>
                      <TableCell>{ch.channel_id}</TableCell>
                      <TableCell>{ch.channel_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={getProviderName(ch.provider_type)}
                          color={CHANNEL_OPTIONS[ch.provider_type]?.color || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{ch.threshold_pct}%</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {ch.target_model}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {ch.is_active ? (
                          <Chip label={`降级中 → ${ch.active_model}`} color="error" size="small" />
                        ) : (
                          <Chip label="正常" color="success" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            降级参数在渠道编辑页面中配置。设置「降级阈值」大于 0 即可启用，配额使用率超过阈值时请求将自动切换到目标模型。
          </Typography>
        </Box>
      </AdminContainer>
    </>
  );
}
