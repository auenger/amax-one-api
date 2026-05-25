import { useState, useEffect, useCallback } from 'react';
import { showError } from 'utils/common';
import { API } from 'utils/api';
import AdminContainer from 'ui-component/AdminContainer';
import {
  Card,
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
  Box
} from '@mui/material';
import { IconRefresh, IconArrowDown } from '@tabler/icons-react';
import { CHANNEL_OPTIONS } from 'constants/ChannelConstants';

const getProviderName = (type) => {
  return CHANNEL_OPTIONS[type]?.text || `Unknown (${type})`;
};

export default function DowngradeRules() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCount = channels.filter((c) => c.is_active).length;

  return (
    <>
      <AdminContainer>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4">降级监控</Typography>
          <Button variant="outlined" startIcon={<IconRefresh />} onClick={loadData} disabled={loading}>
            刷新
          </Button>
        </Stack>

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
