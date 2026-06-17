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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton
} from '@mui/material';
import { IconRefresh, IconArrowDown, IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { CHANNEL_OPTIONS } from 'constants/ChannelConstants';

const getProviderName = (type) => {
  return CHANNEL_OPTIONS[type]?.text || `Unknown (${type})`;
};

// Parse rules JSON from option value
const parseRules = (jsonStr) => {
  try {
    const parsed = JSON.parse(jsonStr || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const emptyRule = () => ({ channel_ids: [], start_hour: 13, end_hour: 18, target_model: '' });

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

  // Time downgrade: global toggle + rules array
  const [timeDowngradeEnabled, setTimeDowngradeEnabled] = useState(false);
  const [timeDowngradeRules, setTimeDowngradeRules] = useState([]);
  const [timeDowngradeLoading, setTimeDowngradeLoading] = useState(false);

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
          if (['FallbackEnabled', 'FallbackChannelId', 'FallbackModel', 'TimeDowngradeEnabled', 'TimeDowngradeRules'].includes(item.key)) {
            opts[item.key] = item.value;
          }
        });
        // Fallback
        if (opts.FallbackEnabled !== undefined) setFallback((prev) => ({ ...prev, ...opts }));
        // Time downgrade
        if (opts.TimeDowngradeEnabled !== undefined) setTimeDowngradeEnabled(opts.TimeDowngradeEnabled === 'true');
        if (opts.TimeDowngradeRules !== undefined) setTimeDowngradeRules(parseRules(opts.TimeDowngradeRules));
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

  // ──── Fallback handlers (unchanged) ────

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

  // ──── Time Downgrade handlers ────

  const handleTimeDowngradeToggle = async () => {
    const newValue = timeDowngradeEnabled ? 'false' : 'true';
    setTimeDowngradeLoading(true);
    try {
      const res = await API.put('/api/option/', { key: 'TimeDowngradeEnabled', value: newValue });
      const { success, message } = res.data;
      if (success) {
        setTimeDowngradeEnabled(newValue === 'true');
        showSuccess(newValue === 'true' ? '定时降级已启用' : '定时降级已禁用');
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
    setTimeDowngradeLoading(false);
  };

  const updateRule = (index, field, value) => {
    setTimeDowngradeRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRule = () => {
    setTimeDowngradeRules((prev) => [...prev, emptyRule()]);
  };

  const removeRule = (index) => {
    setTimeDowngradeRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTimeDowngradeSave = async () => {
    // Validate
    for (let i = 0; i < timeDowngradeRules.length; i++) {
      const rule = timeDowngradeRules[i];
      if (!rule.channel_ids || rule.channel_ids.length === 0) {
        showError(`规则 ${i + 1}：请选择至少一个渠道`);
        return;
      }
      if (rule.start_hour < 0 || rule.start_hour > 23 || rule.end_hour < 1 || rule.end_hour > 24 || rule.start_hour >= rule.end_hour) {
        showError(`规则 ${i + 1}：时间窗口无效`);
        return;
      }
      if (!rule.target_model) {
        showError(`规则 ${i + 1}：请填写降级目标模型`);
        return;
      }
    }
    setTimeDowngradeLoading(true);
    try {
      // Save rules JSON
      const rulesJSON = JSON.stringify(timeDowngradeRules);
      await API.put('/api/option/', { key: 'TimeDowngradeRules', value: rulesJSON });
      showSuccess('定时降级配置已保存');
    } catch (e) {
      showError(e.message);
    }
    setTimeDowngradeLoading(false);
  };

  // Resolve channel objects for multi-select
  const channelMap = useMemo(() => {
    const map = {};
    allChannels.forEach((ch) => { map[ch.id] = ch; });
    return map;
  }, [allChannels]);

  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  const formatHour = (h) => String(h).padStart(2, '0') + ':00';

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

        {/* Time Downgrade Config Card */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6">定时降级</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={timeDowngradeEnabled}
                    onChange={handleTimeDowngradeToggle}
                    disabled={timeDowngradeLoading}
                    color="primary"
                  />
                }
                label={timeDowngradeEnabled ? '已启用' : '未启用'}
              />
            </Stack>
            <Typography variant="body2" color="textSecondary" mb={2}>
              在指定时间段（北京时间）内，将所选渠道的所有模型请求自动替换为降级目标模型。
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {timeDowngradeRules.length === 0 ? (
              <Typography color="textSecondary" py={2} textAlign="center">
                暂无降级规则，点击下方按钮添加
              </Typography>
            ) : (
              <Stack spacing={2} mb={2}>
                {timeDowngradeRules.map((rule, idx) => (
                  <Stack key={idx} direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Autocomplete
                      multiple
                      size="small"
                      sx={{ minWidth: 320, flexGrow: 1 }}
                      options={allChannels}
                      getOptionLabel={(option) => `#${option.id} ${option.name} (${getProviderName(option.type)})`}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      value={rule.channel_ids.map((id) => channelMap[id]).filter(Boolean)}
                      onChange={(e, newValue) => {
                        updateRule(idx, 'channel_ids', newValue.map((ch) => ch.id));
                      }}
                      disabled={!timeDowngradeEnabled || timeDowngradeLoading}
                      renderInput={(params) => (
                        <TextField {...params} label={`规则 ${idx + 1} — 选择渠道`} placeholder="搜索渠道..." />
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
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key, ...rest } = getTagProps({ index });
                          return (
                            <Chip
                              key={option.id}
                              label={`#${option.id} ${option.name}`}
                              size="small"
                              variant="outlined"
                              {...rest}
                            />
                          );
                        })
                      }
                    />
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <InputLabel>开始</InputLabel>
                      <Select
                        value={rule.start_hour}
                        onChange={(e) => updateRule(idx, 'start_hour', e.target.value)}
                        disabled={!timeDowngradeEnabled || timeDowngradeLoading}
                        label="开始"
                      >
                        {hourOptions.map((h) => (
                          <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="body1" sx={{ lineHeight: '40px' }}>—</Typography>
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <InputLabel>结束</InputLabel>
                      <Select
                        value={rule.end_hour}
                        onChange={(e) => updateRule(idx, 'end_hour', e.target.value)}
                        disabled={!timeDowngradeEnabled || timeDowngradeLoading}
                        label="结束"
                      >
                        {hourOptions.map((h) => (
                          <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      sx={{ width: 180 }}
                      label="目标模型"
                      value={rule.target_model}
                      onChange={(e) => updateRule(idx, 'target_model', e.target.value)}
                      disabled={!timeDowngradeEnabled || timeDowngradeLoading}
                      placeholder="glm-4.7"
                    />
                    <IconButton
                      color="error"
                      onClick={() => removeRule(idx)}
                      disabled={!timeDowngradeEnabled || timeDowngradeLoading}
                      size="small"
                      title="删除规则"
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<IconPlus />}
                onClick={addRule}
                disabled={!timeDowngradeEnabled || timeDowngradeLoading}
                size="small"
              >
                添加规则
              </Button>
              <Button
                variant="contained"
                startIcon={<IconDeviceFloppy />}
                onClick={handleTimeDowngradeSave}
                disabled={!timeDowngradeEnabled || timeDowngradeLoading || timeDowngradeRules.length === 0}
                size="small"
              >
                保存
              </Button>
            </Stack>

            {timeDowngradeEnabled && timeDowngradeRules.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {timeDowngradeRules.map((rule, idx) => (
                  <Typography key={idx} variant="body2">
                    规则 {idx + 1}：每天 {formatHour(rule.start_hour)} — {formatHour(rule.end_hour)}，渠道 [{rule.channel_ids.map((id) => {
                      const ch = channelMap[id];
                      return ch ? `#${id} ${ch.name}` : `#${id}`;
                    }).join(', ')}] → {rule.target_model || '未设置'}
                  </Typography>
                ))}
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
