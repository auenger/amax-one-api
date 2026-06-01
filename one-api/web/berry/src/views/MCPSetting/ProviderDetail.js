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
  Switch,
  Chip,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  IconRefresh,
  IconBrandSpeedtest,
  IconArrowLeft,
  IconPlugConnected
} from '@tabler/icons-react';
import AdminContainer from 'ui-component/AdminContainer';
import { useParams, useNavigate } from 'react-router';

export default function MCPProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadProvider = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/api/mcp-provider/${id}`);
      const { success, data, message } = res.data;
      if (success) {
        setProvider(data);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
    setLoading(false);
  }, [id]);

  const loadTools = useCallback(async () => {
    try {
      const res = await API.get(`/api/mcp-provider/${id}/tools`);
      const { success, data, message } = res.data;
      if (success) {
        setTools(data || []);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  }, [id]);

  useEffect(() => {
    loadProvider();
    loadTools();
  }, [loadProvider, loadTools]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await API.post(`/api/mcp-provider/${id}/test`);
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`连接成功！延迟 ${data.latency}ms`);
        setTestResult({ connected: true, latency: data.latency, tools_count: data.tools_count });
      } else {
        showError(message);
        setTestResult({ connected: false, message });
      }
    } catch (err) {
      showError(err.message);
      setTestResult({ connected: false, message: err.message });
    }
    setTesting(false);
  };

  const handleSync = async () => {
    showInfo('正在同步工具...');
    try {
      const res = await API.post(`/api/mcp-provider/${id}/sync`);
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`同步完成，共 ${data?.synced_tools || 0} 个工具`);
        loadTools();
        loadProvider();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleToggleTool = async (tool) => {
    try {
      const res = await API.put(`/api/mcp-tool/${tool.id}`, {
        enabled: !tool.enabled
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(tool.enabled ? '已禁用工具' : '已启用工具');
        loadTools();
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

  if (!provider && !loading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          供应商不存在
        </Typography>
        <Button startIcon={<IconArrowLeft />} onClick={() => navigate('/panel/mcp/providers')}>
          返回供应商列表
        </Button>
      </Stack>
    );
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
        <Button startIcon={<IconArrowLeft />} onClick={() => navigate('/panel/mcp/providers')} size="small">
          返回
        </Button>
        <Typography variant="h4">
          {provider ? provider.display_name || provider.name : '加载中...'}
        </Typography>
        {provider && (
          <Chip
            label={provider.enabled ? '已启用' : '已禁用'}
            size="small"
            color={provider.enabled ? 'success' : 'default'}
          />
        )}
      </Stack>

      {loading && <LinearProgress />}

      {/* Provider Info Card */}
      {provider && (
        <Card sx={{ mb: 2 }}>
          <AdminContainer>
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconPlugConnected size={20} />
                    <Typography variant="h6">{provider.display_name || provider.name}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      名称: <strong>{provider.name}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      前缀: <strong>{provider.tool_prefix}_</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      传输: <Chip label={provider.transport} size="small" variant="outlined" />
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      上次同步: {formatTime(provider.last_sync_at)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                    {provider.base_url}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<IconBrandSpeedtest />}
                    onClick={handleTest}
                    disabled={testing}
                    size="small"
                  >
                    {testing ? '测试中...' : '测试连接'}
                  </Button>
                  <Button variant="outlined" startIcon={<IconRefresh />} onClick={handleSync} size="small">
                    同步工具
                  </Button>
                </Stack>
              </Stack>

              {testResult && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    {testResult.connected ? (
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label="连接成功" color="success" size="small" />
                        <Typography variant="body2">延迟: {testResult.latency}ms</Typography>
                        <Typography variant="body2">工具数: {testResult.tools_count}</Typography>
                      </Stack>
                    ) : (
                      <Chip label={`连接失败: ${testResult.message}`} color="error" size="small" />
                    )}
                  </Box>
                </>
              )}
            </Box>
          </AdminContainer>
        </Card>
      )}

      {/* Tools Table */}
      <Card>
        <AdminContainer>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">工具列表 ({tools.length})</Typography>
              <Button variant="outlined" startIcon={<IconRefresh />} onClick={loadTools} size="small">
                刷新
              </Button>
            </Stack>

            {tools.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  暂无工具，点击"同步工具"从上游获取
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>工具名</TableCell>
                      <TableCell>描述</TableCell>
                      <TableCell>启用</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tools.map((tool) => (
                      <TableRow key={tool.id} hover>
                        <TableCell>{tool.id}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {tool.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tool.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={tool.enabled}
                            onChange={() => handleToggleTool(tool)}
                            size="small"
                            color={tool.enabled ? 'success' : 'default'}
                          />
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
    </>
  );
}
