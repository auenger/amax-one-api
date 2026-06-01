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
  Link
} from '@mui/material';
import {
  IconPlus,
  IconRefresh,
  IconTrash,
  IconPlugConnected,
  IconSync,
  IconBrandSpeedtest,
  IconChevronRight
} from '@tabler/icons-react';
import AdminContainer from 'ui-component/AdminContainer';
import { useNavigate } from 'react-router';

const transportOptions = ['streamable-http', 'sse'];

export default function MCPProviders() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editProvider, setEditProvider] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    base_url: '',
    auth_token: '',
    transport: 'streamable-http',
    tool_prefix: '',
    group: '',
    auto_sync: true,
    enabled: true
  });

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

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleOpenAdd = () => {
    setEditProvider(null);
    setFormData({
      name: '',
      display_name: '',
      base_url: '',
      auth_token: '',
      transport: 'streamable-http',
      tool_prefix: '',
      group: '',
      auto_sync: true,
      enabled: true
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (provider) => {
    setEditProvider(provider);
    setFormData({
      name: provider.name,
      display_name: provider.display_name || '',
      base_url: provider.base_url,
      auth_token: provider.auth_token || '',
      transport: provider.transport || 'streamable-http',
      tool_prefix: provider.tool_prefix || '',
      group: provider.group || '',
      auto_sync: provider.auto_sync,
      enabled: provider.enabled
    });
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditProvider(null);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showError('供应商名称不能为空');
      return;
    }
    if (!formData.base_url) {
      showError('Base URL 不能为空');
      return;
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

  const handleTest = async (id) => {
    showInfo('正在测试连接...');
    try {
      const res = await API.post(`/api/mcp-provider/${id}/test`);
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`连接成功！延迟 ${data.latency}ms，发现 ${data.tools_count} 个工具`);
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
                      <TableCell>传输方式</TableCell>
                      <TableCell>工具前缀</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>自动同步</TableCell>
                      <TableCell>上次同步</TableCell>
                      <TableCell>用户组</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {providers.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <IconPlugConnected size={16} />
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
                          <Chip label={row.transport} size="small" variant="outlined" />
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
                          <Chip
                            label={row.auto_sync ? '自动' : '手动'}
                            size="small"
                            color={row.auto_sync ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(row.last_sync_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.group || '全部'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="测试连接">
                              <IconButton size="small" onClick={() => handleTest(row.id)} color="primary">
                                <IconBrandSpeedtest size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="同步工具">
                              <IconButton size="small" onClick={() => handleSync(row.id)} color="info">
                                <IconSync size={18} />
                              </IconButton>
                            </Tooltip>
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
              label="工具前缀"
              value={formData.tool_prefix}
              onChange={(e) => setFormData({ ...formData, tool_prefix: e.target.value })}
              placeholder="默认与名称相同"
              fullWidth
              helperText="工具名前缀，例如 glm → glm_web_search"
            />
            <TextField
              label="用户组"
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              placeholder="可访问的用户组（留空=全部）"
              fullWidth
            />
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
