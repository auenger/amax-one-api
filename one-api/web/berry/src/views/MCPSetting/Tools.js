import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  Chip,
  Collapse,
  IconButton,
  LinearProgress
} from '@mui/material';
import { IconTools, IconSearch, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

export default function MCPTools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/mcp-public/tools');
      const { success, data, message } = res.data;
      if (success) {
        setTools(data || []);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const filtered = tools.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.display_name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.provider_name || '').toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconTools size={24} />
          <Typography variant="h4">MCP 工具列表</Typography>
          <Chip label={`${filtered.length} 个工具`} size="small" />
        </Stack>
      </Stack>

      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="搜索工具名称、描述或供应商..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />
            }}
          />
        </Box>
      </Card>

      {loading && <LinearProgress />}

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>工具名</TableCell>
                <TableCell>显示名</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>描述</TableCell>
                <TableCell width={48}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      {search ? '未找到匹配的工具' : '暂无工具'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tool) => (
                  <React.Fragment key={tool.id}>
                    <TableRow hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {tool.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{tool.display_name || '-'}</TableCell>
                      <TableCell>
                        <Chip label={tool.provider_name || '-'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {tool.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpand(tool.id)}>
                          {expandedId === tool.id ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, borderBottom: expandedId === tool.id ? undefined : 'none' }}>
                        <Collapse in={expandedId === tool.id} unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                              输入参数 Schema
                            </Typography>
                            <Box
                              sx={{
                                bgcolor: 'grey.100',
                                p: 1.5,
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                maxHeight: 300,
                                overflow: 'auto'
                              }}
                            >
                              {tool.input_schema
                                ? JSON.stringify(JSON.parse(tool.input_schema), null, 2)
                                : '无参数'}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
