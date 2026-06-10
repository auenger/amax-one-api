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
  Button,
  TablePagination,
  Tab,
  Tabs
} from '@mui/material';
import { IconRefresh, IconChartBar } from '@tabler/icons-react';

export default function MCPStats() {
  const [stats, setStats] = useState({ providers: [], tools: [] });
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [logsPageSize, setLogsPageSize] = useState(20);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsStartTime, setLogsStartTime] = useState('');
  const [logsEndTime, setLogsEndTime] = useState('');
  const [logsUserName, setLogsUserName] = useState('');
  const [logsToolName, setLogsToolName] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
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

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', logsPage + 1);
      params.set('page_size', logsPageSize);
      if (logsStartTime) {
        params.set('start', Math.floor(new Date(logsStartTime).getTime() / 1000));
      }
      if (logsEndTime) {
        params.set('end', Math.floor(new Date(logsEndTime).getTime() / 1000));
      }
      if (logsUserName) {
        params.set('user_name', logsUserName);
      }
      if (logsToolName) {
        params.set('tool_name', logsToolName);
      }
      const res = await API.get(`/api/mcp-stats/logs?${params.toString()}`);
      const { success, data, message } = res.data;
      if (success) {
        setLogs(data.logs || []);
        setLogsTotal(data.total || 0);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
    setLogsLoading(false);
  }, [logsPage, logsPageSize, logsStartTime, logsEndTime, logsUserName, logsToolName]);

  useEffect(() => {
    if (activeTab === 1) {
      loadLogs();
    }
  }, [activeTab, loadLogs]);

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

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="汇总统计" />
        <Tab label="调用明细" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Stack direction="row" spacing={2} mb={2} sx={{ flexWrap: 'wrap' }}>
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">总调用次数</Typography>
                <Typography variant="h3">{totalCalls}</Typography>
              </Box>
            </Card>
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">成功率</Typography>
                <Typography variant="h3" color={successRate >= 90 ? 'success.main' : successRate >= 70 ? 'warning.main' : 'error.main'}>
                  {successRate}%
                </Typography>
              </Box>
            </Card>
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">供应商数</Typography>
                <Typography variant="h3">{(stats.providers || []).length}</Typography>
              </Box>
            </Card>
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">工具数</Typography>
                <Typography variant="h3">{(stats.tools || []).length}</Typography>
              </Box>
            </Card>
          </Stack>

          <Card sx={{ mb: 2 }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField label="开始时间" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
                <TextField label="结束时间" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
                <Button variant="outlined" startIcon={<IconRefresh />} onClick={loadStats} size="small">查询</Button>
              </Stack>
            </Box>
          </Card>

          {loading && <LinearProgress />}

          <Card sx={{ mb: 2 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>按供应商统计</Typography>
              {(stats.providers || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>暂无数据</Typography>
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
                            <TableCell><Chip label={row.provider_name} size="small" /></TableCell>
                            <TableCell align="right"><Typography variant="body2" fontWeight="bold">{row.total_calls}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" color="success.main">{row.success_calls}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" color="error.main">{row.failed_calls}</Typography></TableCell>
                            <TableCell align="right">{rate}%</TableCell>
                            <TableCell align="right">{formatDuration(row.avg_duration)}</TableCell>
                            <TableCell><Typography variant="caption" color="text.secondary">{row.last_called_at ? new Date(row.last_called_at * 1000).toLocaleString() : '-'}</Typography></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Card>

          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>按工具统计</Typography>
              {(stats.tools || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>暂无数据</Typography>
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
                      {(stats.tools || []).sort((a, b) => b.total_calls - a.total_calls).map((row) => {
                        const rate = row.total_calls > 0 ? ((row.success_calls / row.total_calls) * 100).toFixed(1) : '-';
                        return (
                          <TableRow key={row.tool_name} hover>
                            <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.tool_name}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" fontWeight="bold">{row.total_calls}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" color="success.main">{row.success_calls}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" color="error.main">{row.failed_calls}</Typography></TableCell>
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
          </Card>
        </>
      )}

      {activeTab === 1 && (
        <>
          <Card sx={{ mb: 2 }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField label="开始时间" type="datetime-local" value={logsStartTime} onChange={(e) => { setLogsStartTime(e.target.value); setLogsPage(0); }} size="small" InputLabelProps={{ shrink: true }} />
                <TextField label="结束时间" type="datetime-local" value={logsEndTime} onChange={(e) => { setLogsEndTime(e.target.value); setLogsPage(0); }} size="small" InputLabelProps={{ shrink: true }} />
                <TextField label="用户名" value={logsUserName} onChange={(e) => { setLogsUserName(e.target.value); setLogsPage(0); }} size="small" placeholder="筛选用户" />
                <TextField label="工具名" value={logsToolName} onChange={(e) => { setLogsToolName(e.target.value); setLogsPage(0); }} size="small" placeholder="筛选工具" />
                <Button variant="outlined" startIcon={<IconRefresh />} onClick={loadLogs} size="small">查询</Button>
              </Stack>
            </Box>
          </Card>

          {logsLoading && <LinearProgress />}

          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>用户</TableCell>
                    <TableCell>工具</TableCell>
                    <TableCell>供应商</TableCell>
                    <TableCell>调用时间</TableCell>
                    <TableCell align="right">耗时</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>错误信息</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.user_name || '-'}</TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.tool_name}</Typography></TableCell>
                        <TableCell><Chip label={row.provider_name} size="small" variant="outlined" /></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{new Date(row.created_at * 1000).toLocaleString()}</Typography></TableCell>
                        <TableCell align="right">{formatDuration(row.duration)}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.response_status === 200 ? '成功' : '失败'}
                            size="small"
                            color={row.response_status === 200 ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="error.main" sx={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.error_message || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={logsTotal}
              page={logsPage}
              onPageChange={(_, p) => setLogsPage(p)}
              rowsPerPage={logsPageSize}
              onRowsPerPageChange={(e) => { setLogsPageSize(parseInt(e.target.value, 10)); setLogsPage(0); }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </Card>
        </>
      )}
    </>
  );
}
