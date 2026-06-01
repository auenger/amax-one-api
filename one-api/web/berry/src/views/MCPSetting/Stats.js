import { useState, useEffect, useCallback } from 'react';
import { showError } from 'utils/common';
import { API } from 'utils/api';
import {
  Box,
  Card,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  TextField,
  Button
} from '@mui/material';
import { IconRefresh, IconChartBar } from '@tabler/icons-react';
import AdminContainer from 'ui-component/AdminContainer';

export default function MCPStats() {
  const [stats, setStats] = useState({ providers: [], tools: [] });
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Default to last 7 days if no time range specified
      if (startTime) {
        params.set('start', Math.floor(new Date(startTime).getTime() / 1000));
      } else {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.set('start', Math.floor(weekAgo.getTime() / 1000));
      }
      if (endTime) {
        params.set('end', Math.floor(new Date(endTime).getTime() / 1000));
      }

      const res = await API.get(`/api/mcp-stats/?${params.toString()}`);
      const { success, data, message } = res.data;
      if (success) {
        setStats(data || { providers: [], tools: [] });
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
    setLoading(false);
  }, [startTime, endTime]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatDuration = (ms) => {
    if (!ms || ms === 0) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const totalCalls = (stats.providers || []).reduce((sum, p) => sum + p.total_calls, 0);
  const totalSuccess = (stats.providers || []).reduce((sum, p) => sum + p.success_calls, 0);
  const successRate = totalCalls > 0 ? ((totalSuccess / totalCalls) * 100).toFixed(1) : '-';

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconChartBar size={24} />
          <Typography variant="h4">MCP 使用统计</Typography>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Stack direction="row" spacing={2} mb={2} sx={{ flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <AdminContainer>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                总调用次数
              </Typography>
              <Typography variant="h3">{totalCalls}</Typography>
            </Box>
          </AdminContainer>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <AdminContainer>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                成功率
              </Typography>
              <Typography variant="h3" color={successRate >= 90 ? 'success.main' : successRate >= 70 ? 'warning.main' : 'error.main'}>
                {successRate}%
              </Typography>
            </Box>
          </AdminContainer>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <AdminContainer>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                供应商数
              </Typography>
              <Typography variant="h3">{(stats.providers || []).length}</Typography>
            </Box>
          </AdminContainer>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <AdminContainer>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                工具数
              </Typography>
              <Typography variant="h3">{(stats.tools || []).length}</Typography>
            </Box>
          </AdminContainer>
        </Card>
      </Stack>

      {/* Time Filter */}
      <Card sx={{ mb: 2 }}>
        <AdminContainer>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="开始时间"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="结束时间"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="outlined" startIcon={<IconRefresh />} onClick={loadStats} size="small">
                查询
              </Button>
            </Stack>
          </Box>
        </AdminContainer>
      </Card>

      {loading && <LinearProgress />}

      {/* Provider Stats */}
      <Card sx={{ mb: 2 }}>
        <AdminContainer>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              按供应商统计
            </Typography>
            {(stats.providers || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                暂无数据
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>供应商</TableCell>
                      <TableCell align="right">调用次数</TableCell>
                      <TableCell align="right">成功</TableCell>
                      <TableCell align="right">失败</TableCell>
                      <TableCell align="right">成功率</TableCell>
                      <TableCell align="right">平均延迟</TableCell>
                      <TableCell>最后调用</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats.providers || []).map((row) => {
                      const rate = row.total_calls > 0 ? ((row.success_calls / row.total_calls) * 100).toFixed(1) : '-';
                      return (
                        <TableRow key={row.provider_id} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Chip label={row.provider_name} size="small" />
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {row.total_calls}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="success.main">
                              {row.success_calls}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="error.main">
                              {row.failed_calls}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{rate}%</TableCell>
                          <TableCell align="right">{formatDuration(row.avg_duration)}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {row.last_called_at ? new Date(row.last_called_at * 1000).toLocaleString() : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </AdminContainer>
      </Card>

      {/* Tool Stats */}
      <Card>
        <AdminContainer>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              按工具统计
            </Typography>
            {(stats.tools || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                暂无数据
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>工具名</TableCell>
                      <TableCell align="right">调用次数</TableCell>
                      <TableCell align="right">成功</TableCell>
                      <TableCell align="right">失败</TableCell>
                      <TableCell align="right">成功率</TableCell>
                      <TableCell align="right">平均延迟</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats.tools || [])
                      .sort((a, b) => b.total_calls - a.total_calls)
                      .map((row) => {
                        const rate = row.total_calls > 0 ? ((row.success_calls / row.total_calls) * 100).toFixed(1) : '-';
                        return (
                          <TableRow key={row.tool_name} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {row.tool_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {row.total_calls}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main">
                                {row.success_calls}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="error.main">
                                {row.failed_calls}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{rate}%</TableCell>
                            <TableCell align="right">{formatDuration(row.avg_duration)}</TableCell>
                          </TableRow>
                        );
                      })}
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
