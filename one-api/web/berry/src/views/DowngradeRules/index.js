import { useState, useEffect, useCallback } from 'react';
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
  TextField,
  FormControlLabel,
  Divider
} from '@mui/material';
import { IconRefresh, IconArrowDown, IconDeviceFloppy } from '@tabler/icons-react';
import { CHANNEL_OPTIONS } from 'constants/ChannelConstants';

const getProviderName = (type) => {
  return CHANNEL_OPTIONS[type]?.text || `Unknown (${type})`;
};

export default function DowngradeRules() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
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
  }, [loadData, loadFallbackOptions]);

  const activeCount = channels.filter((c) => c.is_active).length;
  const fallbackEnabled = fallback.FallbackEnabled === 'true';

  const handleFallbackChange = (field, value) => {
    setFallback((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleFallbackSave = async () => {
    if (fallbackEnabled) {
      if (!fallback.FallbackChannelId || fallback.FallbackChannelId === '0') {
        showError('启用状态下渠道 ID 不能为空');
        return;
      }
      if (!fallback.FallbackModel) {
        showError('启用状态下兜底模型名称不能为空');
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
          <Typography variant="h4">降级监控</Typography>
          <Button variant="outlined" startIcon={<IconRefresh />} onClick={() => { loadData(); loadFallbackOptions(); }} disabled={loading}>
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
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <TextField
                label="兜底渠道 ID"
                type="number"
                size="small"
                value={fallback.FallbackChannelId === '0' ? '' : fallback.FallbackChannelId}
                onChange={(e) => handleFallbackChange('FallbackChannelId', e.target.value)}
                disabled={!fallbackEnabled || fallbackLoading}
                placeholder="例如: 5"
                sx={{ width: 180 }}
              />
              <TextField
                label="兜底模型名称"
                size="small"
                value={fallback.FallbackModel}
                onChange={(e) => handleFallbackChange('FallbackModel', e.target.value)}
                disabled={!fallbackEnabled || fallbackLoading}
                placeholder="例如: gpt-4o-mini"
                sx={{ width: 300 }}
              />
              <Button
                variant="contained"
                startIcon={<IconDeviceFloppy />}
                onClick={handleFallbackSave}
                disabled={!fallbackEnabled || fallbackLoading}
                size="small"
              >
                保存
              </Button>
            </Stack>
            {fallbackEnabled && fallback.FallbackChannelId && fallback.FallbackModel && (
              <Alert severity="info" sx={{ mt: 1 }}>
                兜底配置：渠道 #{fallback.FallbackChannelId} → {fallback.FallbackModel}
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
