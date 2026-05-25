import { useState, useEffect, useCallback } from 'react';
import { showError, showSuccess } from 'utils/common';
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
  IconButton,
  Switch,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  MenuItem,
  Box,
  Stack,
  Alert
} from '@mui/material';
import { IconPlus, IconTrash, IconEdit, IconRefresh, IconArrowDown } from '@tabler/icons-react';
import { CHANNEL_OPTIONS } from 'constants/ChannelConstants';

const PROVIDER_OPTIONS = Object.values(CHANNEL_OPTIONS)
  .filter((ch) => ch.key)
  .sort((a, b) => a.text.localeCompare(b.text));

export default function DowngradeRules() {
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [formData, setFormData] = useState({
    provider_type: '',
    threshold_pct: 90,
    target_model: '',
    enabled: true
  });

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/downgrade/rules');
      const { success, data, message } = res.data;
      if (success) {
        setRules(data || []);
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
    setLoading(false);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await API.get('/api/downgrade/status');
      const { success, data, message } = res.data;
      if (success) {
        setStatus(data?.active_downgrades || {});
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
  }, []);

  useEffect(() => {
    loadRules();
    loadStatus();
  }, [loadRules, loadStatus]);

  const handleCreate = () => {
    setEditRule(null);
    setFormData({ provider_type: '', threshold_pct: 90, target_model: '', enabled: true });
    setEditOpen(true);
  };

  const handleEdit = (rule) => {
    setEditRule(rule);
    setFormData({
      provider_type: rule.provider_type,
      threshold_pct: rule.threshold_pct,
      target_model: rule.target_model,
      enabled: rule.enabled
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formData.provider_type && formData.provider_type !== 0) {
      showError('请选择供应商');
      return;
    }
    if (!formData.target_model) {
      showError('请输入目标模型');
      return;
    }

    try {
      let res;
      if (editRule) {
        res = await API.put(`/api/downgrade/rules/${editRule.id}`, formData);
      } else {
        res = await API.post('/api/downgrade/rules', formData);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess(editRule ? '更新成功' : '创建成功');
        setEditOpen(false);
        loadRules();
        loadStatus();
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除此降级规则吗？')) return;
    try {
      const res = await API.delete(`/api/downgrade/rules/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('删除成功');
        loadRules();
        loadStatus();
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const handleToggleEnabled = async (rule) => {
    try {
      const res = await API.put(`/api/downgrade/rules/${rule.id}`, {
        ...rule,
        enabled: !rule.enabled
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(rule.enabled ? '已禁用' : '已启用');
        loadRules();
        loadStatus();
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const getProviderName = (type) => {
    return CHANNEL_OPTIONS[type]?.text || `Unknown (${type})`;
  };

  const activeCount = Object.keys(status).length;

  return (
    <>
      <AdminContainer>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4">模型降级策略</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<IconRefresh />} onClick={() => { loadRules(); loadStatus(); }} disabled={loading}>
              刷新
            </Button>
            <Button variant="contained" startIcon={<IconPlus />} onClick={handleCreate}>
              新增规则
            </Button>
          </Stack>
        </Stack>

        {activeCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<IconArrowDown size={20} />}>
            当前有 <strong>{activeCount}</strong> 个供应商正在降级：{' '}
            {Object.entries(status).map(([type, model]) => (
              <Chip
                key={type}
                label={`${getProviderName(Number(type))} → ${model}`}
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
                  <TableCell>ID</TableCell>
                  <TableCell>供应商</TableCell>
                  <TableCell>降级阈值 (%)</TableCell>
                  <TableCell>目标模型</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>启用</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary" py={4}>
                        暂无降级规则，点击「新增规则」创建
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.id}</TableCell>
                      <TableCell>
                        <Chip
                          label={getProviderName(rule.provider_type)}
                          color={CHANNEL_OPTIONS[rule.provider_type]?.color || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{rule.threshold_pct}%</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {rule.target_model}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {status[rule.provider_type] ? (
                          <Chip label="降级中" color="error" size="small" />
                        ) : (
                          <Chip label="正常" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={rule.enabled} onChange={() => handleToggleEnabled(rule)} color="primary" size="small" />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={() => handleEdit(rule)}>
                          <IconEdit size={18} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}>
                          <IconTrash size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </AdminContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRule ? '编辑降级规则' : '新增降级规则'}</DialogTitle>
        <DialogContent>
          <Box mt={1} display="flex" flexDirection="column" gap={2}>
            <TextField
              select
              label="供应商"
              value={formData.provider_type}
              onChange={(e) => setFormData({ ...formData, provider_type: Number(e.target.value) })}
              disabled={!!editRule}
              fullWidth
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <MenuItem key={opt.key} value={opt.key}>
                  {opt.text}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="降级阈值 (%)"
              type="number"
              value={formData.threshold_pct}
              onChange={(e) => setFormData({ ...formData, threshold_pct: Number(e.target.value) })}
              inputProps={{ min: 1, max: 100 }}
              helperText="配额使用率超过此阈值时触发降级 (1-100)"
              fullWidth
            />
            <TextField
              label="目标模型"
              value={formData.target_model}
              onChange={(e) => setFormData({ ...formData, target_model: e.target.value })}
              helperText="降级后使用的模型名称，如 glm-4.7"
              placeholder="glm-4.7"
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  color="primary"
                />
              }
              label="启用"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
