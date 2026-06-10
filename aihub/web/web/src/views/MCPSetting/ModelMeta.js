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
  TextField,
  Chip,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { IconRefresh, IconSearch, IconScan } from '@tabler/icons-react';
import AdminContainer from 'ui-component/AdminContainer';

export default function ModelMeta() {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState('all'); // all | multimodal | text-only

  const loadMetas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/model-meta/');
      const { success, message, data } = res.data;
      if (success) {
        setMetas(data || []);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMetas();
  }, [loadMetas]);

  const handleToggle = async (meta) => {
    try {
      const res = await API.put('/api/model-meta/', {
        model_name: meta.model_name,
        multimodal: !meta.multimodal
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(meta.multimodal ? '已取消多模态标记' : '已标记为多模态');
        loadMetas();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleScan = async () => {
    showInfo('正在扫描新模型...');
    try {
      const res = await API.post('/api/model-meta/scan');
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`扫描完成：共 ${data?.total || 0} 个渠道模型，新增 ${data?.new_models || 0} 个`);
        loadMetas();
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const filteredMetas = metas.filter((m) => {
    if (keyword && !m.model_name.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
    if (filter === 'multimodal' && !m.multimodal) return false;
    if (filter === 'text-only' && m.multimodal) return false;
    return true;
  });

  const multimodalCount = metas.filter((m) => m.multimodal).length;

  const formatTime = (ts) => {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h4">模型标记</Typography>
          <Chip label={`${multimodalCount} 多模态 / ${metas.length} 总计`} size="small" variant="outlined" />
        </Stack>
      </Stack>

      <Card>
        {loading && <LinearProgress />}
        <AdminContainer>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} mb={2} alignItems="center">
              <TextField
                size="small"
                placeholder="搜索模型..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                InputProps={{ startAdornment: <IconSearch size={16} style={{ marginRight: 4 }} /> }}
                sx={{ width: 240 }}
              />
              <Chip
                label="全部"
                size="small"
                variant={filter === 'all' ? 'filled' : 'outlined'}
                color={filter === 'all' ? 'primary' : 'default'}
                onClick={() => setFilter('all')}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label="多模态"
                size="small"
                variant={filter === 'multimodal' ? 'filled' : 'outlined'}
                color={filter === 'multimodal' ? 'success' : 'default'}
                onClick={() => setFilter('multimodal')}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label="仅文本"
                size="small"
                variant={filter === 'text-only' ? 'filled' : 'outlined'}
                color={filter === 'text-only' ? 'default' : 'default'}
                onClick={() => setFilter('text-only')}
                sx={{ cursor: 'pointer' }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Button variant="outlined" startIcon={<IconScan size={16} />} onClick={handleScan} size="small">
                扫描新模型
              </Button>
              <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={loadMetas} size="small">
                刷新
              </Button>
            </Stack>

            {filteredMetas.length === 0 && !loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {metas.length === 0 ? '暂无模型数据，点击"扫描新模型"开始' : '没有匹配的模型'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>模型名称</TableCell>
                      <TableCell>多模态</TableCell>
                      <TableCell>更新时间</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMetas.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {row.model_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={row.multimodal ? '点击取消标记' : '点击标记为多模态'}>
                            <Switch
                              checked={row.multimodal}
                              onChange={() => handleToggle(row)}
                              size="small"
                              color={row.multimodal ? 'success' : 'default'}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(row.updated_at)}
                          </Typography>
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
