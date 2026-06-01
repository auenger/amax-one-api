import { useState, useEffect, useCallback } from 'react';
import { showError, showSuccess, showInfo } from 'utils/common';
import { API } from 'utils/api';
import {
  Box,
  Card,
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  LinearProgress,
  Link,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  IconPlus,
  IconRefresh,
  IconTrash,
  IconPlugConnected,
  IconBrandSpeedtest,
  IconChevronRight,
  IconEye
} from '@tabler/icons-react';
import AdminContainer from 'ui-component/AdminContainer';
import { useNavigate } from 'react-router';

const transportOptions = ['streamable-http', 'sse'];
const providerTypes = [
  { value: 'upstream', label: '外部代理' },
  { value: 'builtin', label: '内置视觉理解' }
];

const defaultFormData = {
  name: '',
  display_name: '',
  type: 'upstream',
  base_url: '',
  auth_token: '',
  transport: 'streamable-http',
  tool_prefix: '',
  group: '',
  auto_sync: true,
  enabled: true,
  builtin_config: JSON.stringify({
    tool_type: 'vision',
    channel_id: 0,
    model: '',
    system_prompt: '',
    max_tokens: 4096
  })
};

export default function MCPProviders() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editProvider, setEditProvider] = useState(null);
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [visionChannels, setVisionChannels] = useState([]);
  const [selectedChannelModels, setSelectedChannelModels] = useState([]);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/mcp-provider/');
      const { success, message, data } = res.data;
      if (success) {
        setProviders(data || []);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
    setLoading(false);
  }, []);

  const loadVisionChannels = useCallback(async () => {
    try {
      const res = await API.get('/api/mcp-provider/vision-channels');
      const { success, data } = res.data;
      if (success) {
        setVisionChannels(data || []);
      }
    } catch (err) {
      // silently fail - vision channels are optional
    }
  }, []);

  useEffect(() => {
    loadProviders();
    loadVisionChannels();
  }, [loadProviders, loadVisionChannels]);

  const handleOpenAdd = () => {
    setEditProvider(null);
    setFormData({ ...defaultFormData });
    setSelectedChannelModels([]);
    setOpenModal(true);
  };

  const handleOpenEdit = (provider) => {
    setEditProvider(provider);
    const isBuiltin = provider.type === 'builtin';
    let builtinConfig = {
      tool_type: 'vision',
      channel_id: 0,
      model: '',
      system_prompt: '',
      max_tokens: 4096
    };
    if (isBuiltin && provider.builtin_config) {
      try {
        builtinConfig = JSON.parse(provider.builtin_config);
      } catch (e) { /* use default */ }
    }

    // Set channel models for editing
    if (builtinConfig.channel_id) {
      const ch = visionChannels.find((c) => c.id === builtinConfig.channel_id);
      setSelectedChannelModels(ch ? ch.models : []);
    }

    setFormData({
      name: provider.name,
      display_name: provider.display_name || '',
      type: provider.type || 'upstream',
      base_url: provider.base_url || '',
      auth_token: provider.auth_token || '',
      transport: provider.transport || 'streamable-http',
      tool_prefix: provider.tool_prefix || '',
      group: provider.group || '',
      auto_sync: provider.auto_sync,
      enabled: provider.enabled,
      builtin_config: JSON.stringify(builtinConfig)
    });
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditProvider(null);
    setSelectedChannelModels([]);
  };

  const getBuiltinConfig = () => {
    try {
      return JSON.parse(formData.builtin_config);
    } catch {
      return { tool_type: 'vision', channel_id: 0, model: '', system_prompt: '', max_tokens: 4096 };
    }
  };

  const updateBuiltinConfig = (field, value) => {
    const config = getBuiltinConfig();
    config[field] = value;
    setFormData({ ...formData, builtin_config: JSON.stringify(config) });
  };

  const handleChannelChange = (channelId) => {
    const ch = visionChannels.find((c) => c.id === channelId);
    setSelectedChannelModels(ch ? ch.models : []);
    updateBuiltinConfig('channel_id', channelId);
    updateBuiltinConfig('model', '');
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showError('供应商名称不能为空');
      return;
    }

    const isBuiltin = formData.type === 'builtin';
    if (!isBuiltin && !formData.base_url) {
      showError('Base URL 不能为空');
      return;
    }

    if (isBuiltin) {
      const config = getBuiltinConfig();
      if (!config.channel_id) {
        showError('请选择渠道');
        return;
      }
      if (!config.model) {
        showError('请选择模型');
        return;
      }
    }

    try {
      let res;
      if (editProvider) {
        res = await API.put('/api/mcp-provider/', { id: editProvider.id, ...formData });
      } else {
        res = await API.post('/api/mcp-provider/', formData);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess(editProvider ? '更新成功' : '创建成功');
        handleCloseModal();
        loadProviders();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除此供应商吗？关联的工具也将被删除。')) return;
    try {
      const res = await API.delete(`/api/mcp-provider/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('删除成功');
        loadProviders();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleTest = async (provider) => {
    if (provider.type === 'builtin') {
      showInfo('正在测试视觉理解工具...');
    } else {
      showInfo('正在测试连接...');
    }
    try {
      const res = await API.post(`/api/mcp-provider/${provider.id}/test`);
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`测试成功！延迟 ${data.latency}ms`);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleSync = async (id) => {
    showInfo('正在同步工具...');
    try {
      const res = await API.post(`/api/mcp-provider/${id}/sync`);
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`同步完成，共 ${data?.synced_tools || 0} 个工具`);
        loadProviders();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleToggleEnabled = async (provider) => {
    try {
      const res = await API.put('/api/mcp-provider/', {
        ...provider,
        enabled: !provider.enabled
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(provider.enabled ? '已禁用' : '已启用');
        loadProviders();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleString();
  };

  const isBuiltin = formData.type === 'builtin';
  const builtinConfig = getBuiltinConfig();

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Typography variant="h4">MCP 供应商</Typography>
        <Button variant="contained" color="primary" startIcon={<IconPlus />} onClick={handleOpenAdd}>
          添加供应商
        </Button>
      </Stack>

      <Card>
        {loading && <LinearProgress />}
        <AdminContainer>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} mb={2}>
              <Button variant="outlined" startIcon={<IconRefresh />} onClick={loadProviders} size="small">
                刷新
              </Button>
            </Stack>

            {providers.length === 0 && !loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  暂无供应商，点击"添加供应商"开始配置
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>名称</TableCell>
                      <TableCell>类型</TableCell>
                      <TableCell>传输方式</TableCell>
                      <TableCell>工具前缀</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>自动同步</TableCell>
                      <TableCell>上次同步</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {providers.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {row.type === 'builtin' ? (
                              <IconEye size={16} />
                            ) : (
                              <IconPlugConnected size={16} />
                            )}
                            <Link
                              component="button"
                              variant="body2"
                              onClick={() => navigate(`/panel/mcp/providers/${row.id}`)}
                              sx={{ cursor: 'pointer', textDecoration: 'none' }}
                            >
                              {row.display_name || row.name}
                            </Link>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.type === 'builtin' ? '内置' : '外部'}
                            size="small"
                            color={row.type === 'builtin' ? 'secondary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {row.type === 'builtin' ? (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          ) : (
                            <Chip label={row.transport} size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {row.tool_prefix}_
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={row.enabled}
                            onChange={() => handleToggleEnabled(row)}
                            size="small"
                            color={row.enabled ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {row.type === 'builtin' ? (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          ) : (
                            <Chip
                              label={row.auto_sync ? '自动' : '手动'}
                              size="small"
                              color={row.auto_sync ? 'primary' : 'default'}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(row.last_sync_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="测试">
                              <IconButton size="small" onClick={() => handleTest(row)} color="primary">
                                <IconBrandSpeedtest size={18} />
                              </IconButton>
                            </Tooltip>
                            {row.type !== 'builtin' && (
                              <Tooltip title="同步工具">
                                <IconButton size="small" onClick={() => handleSync(row.id)} color="info">
                                  <IconRefresh size={18} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="编辑">
                              <IconButton size="small" onClick={() => handleOpenEdit(row)}>
                                <IconChevronRight size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="删除">
                              <IconButton size="small" onClick={() => handleDelete(row.id)} color="error">
                                <IconTrash size={18} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </AdminContainer>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>{editProvider ? '编辑供应商' : '添加供应商'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="名称 (唯一标识)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: glm"
              required
              fullWidth
              disabled={!!editProvider}
            />
            <TextField
              label="显示名称"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="例如: 智谱 GLM"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>类型</InputLabel>
              <Select
                value={formData.type}
                label="类型"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={!!editProvider}
              >
                {providerTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!isBuiltin ? (
              <>
                {/* Upstream provider fields */}
                <TextField
                  label="Base URL"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="上游 MCP Server URL"
                  required
                  fullWidth
                />
                <TextField
                  label="Auth Token"
                  value={formData.auth_token}
                  onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                  placeholder="上游认证凭据（可选）"
                  type="password"
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>传输方式</InputLabel>
                  <Select
                    value={formData.transport}
                    label="传输方式"
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                  >
                    {transportOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="用户组"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  placeholder="可访问的用户组（留空=全部）"
                  fullWidth
                />
              </>
            ) : (
              <>
                {/* Builtin vision tool fields */}
                <FormControl fullWidth>
                  <InputLabel>渠道</InputLabel>
                  <Select
                    value={builtinConfig.channel_id || ''}
                    label="渠道"
                    onChange={(e) => handleChannelChange(Number(e.target.value))}
                  >
                    <MenuItem value="" disabled>
                      选择支持多模态的渠道
                    </MenuItem>
                    {visionChannels.map((ch) => (
                      <MenuItem key={ch.id} value={ch.id}>
                        {ch.name} (ID: {ch.id})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={selectedChannelModels.length === 0}>
                  <InputLabel>模型</InputLabel>
                  <Select
                    value={builtinConfig.model || ''}
                    label="模型"
                    onChange={(e) => updateBuiltinConfig('model', e.target.value)}
                  >
                    <MenuItem value="" disabled>
                      选择模型
                    </MenuItem>
                    {selectedChannelModels.map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="System Prompt（可选）"
                  value={builtinConfig.system_prompt || ''}
                  onChange={(e) => updateBuiltinConfig('system_prompt', e.target.value)}
                  placeholder="You are a helpful vision assistant."
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="Max Tokens"
                  value={builtinConfig.max_tokens || 4096}
                  onChange={(e) => updateBuiltinConfig('max_tokens', parseInt(e.target.value) || 4096)}
                  type="number"
                  fullWidth
                />
              </>
            )}

            <TextField
              label="工具前缀"
              value={formData.tool_prefix}
              onChange={(e) => setFormData({ ...formData, tool_prefix: e.target.value })}
              placeholder="默认与名称相同"
              fullWidth
              helperText={isBuiltin ? "工具名前缀，例如 vision → vision_vision_analyze" : "工具名前缀，例如 glm → glm_web_search"}
            />
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.auto_sync}
                    onChange={(e) => setFormData({ ...formData, auto_sync: e.target.checked })}
                  />
                }
                label="自动同步工具"
                sx={{ display: isBuiltin ? 'none' : 'flex' }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editProvider ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
