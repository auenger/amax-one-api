import { useState, useEffect } from 'react';
import { showError } from 'utils/common';
import { API } from 'utils/api';
import { Box, Card, Typography, Chip, Stack, Divider, IconButton, Tooltip, LinearProgress } from '@mui/material';
import { IconPlugConnected, IconCopy } from '@tabler/icons-react';

const MCPSetting = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await API.get('/api/mcp-public/server-config');
        const { success, data, message } = res.data;
        if (success) {
          setConfig(data);
        } else {
          showError(message);
        }
      } catch (err) {
        showError(err.message);
      }
      setLoading(false);
    };
    loadConfig();
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const streamableUrl = config?.streamable_http_url || `${window.location.origin}/mcp/v1/message`;
  const sseUrl = config?.sse_url || `${window.location.origin}/mcp/v1/sse`;

  const claudeCodeConfigStreamable = JSON.stringify(
    {
      mcpServers: {
        aihub: {
          type: 'streamable-http',
          url: streamableUrl,
          headers: {
            Authorization: 'Bearer sk-your-token-here'
          }
        }
      }
    },
    null,
    2
  );

  const claudeCodeConfigSSE = JSON.stringify(
    {
      mcpServers: {
        aihub: {
          url: sseUrl,
          headers: {
            Authorization: 'Bearer sk-your-token-here'
          }
        }
      }
    },
    null,
    2
  );

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconPlugConnected size={24} />
            <Typography variant="h4">MCP Server</Typography>
            <Chip label="Beta" color="primary" size="small" />
          </Stack>

          <Typography variant="body1" color="text.secondary">
            AIHub 可以作为 MCP Server 暴露给 Claude Code、Cursor 等 AI 客户端。使用下方的端点地址配置你的 MCP 客户端。
          </Typography>

          {loading && <LinearProgress />}

          {!loading && (
            <>
              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Streamable HTTP 端点
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      p: 1.5,
                      borderRadius: 1,
                      wordBreak: 'break-all',
                      flex: 1,
                      fontSize: '0.875rem'
                    }}
                  >
                    {streamableUrl}
                  </Box>
                  <Tooltip title="复制">
                    <IconButton size="small" onClick={() => copyToClipboard(streamableUrl)}>
                      <IconCopy size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  SSE 端点
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      p: 1.5,
                      borderRadius: 1,
                      wordBreak: 'break-all',
                      flex: 1,
                      fontSize: '0.875rem'
                    }}
                  >
                    {sseUrl}
                  </Box>
                  <Tooltip title="复制">
                    <IconButton size="small" onClick={() => copyToClipboard(sseUrl)}>
                      <IconCopy size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Claude Code 配置
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  在 Claude Code 的 MCP 配置文件中添加以下内容（推荐使用 Streamable HTTP 方式）：
                </Typography>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  方式一：Streamable HTTP（推荐）
                </Typography>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Box
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      p: 1.5,
                      borderRadius: 1,
                      flex: 1,
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {claudeCodeConfigStreamable}
                  </Box>
                  <Tooltip title="复制">
                    <IconButton size="small" onClick={() => copyToClipboard(claudeCodeConfigStreamable)}>
                      <IconCopy size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  方式二：SSE
                </Typography>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Box
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      p: 1.5,
                      borderRadius: 1,
                      flex: 1,
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {claudeCodeConfigSSE}
                  </Box>
                  <Tooltip title="复制">
                    <IconButton size="small" onClick={() => copyToClipboard(claudeCodeConfigSSE)}>
                      <IconCopy size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  将 <code>sk-your-token-here</code> 替换为你的 AIHub API 令牌。
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  使用说明
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  1. 在 AIHub 中创建一个 API 令牌
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  2. 将上方的配置添加到 Claude Code 的 MCP 配置文件中
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. 可用的工具取决于已启用的 MCP 供应商配置
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </Box>
    </Card>
  );
};

export default MCPSetting;
