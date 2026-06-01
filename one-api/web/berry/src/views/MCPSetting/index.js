import { Box, Card, Typography, Chip, Stack, Divider } from '@mui/material';
import { IconPlugConnected } from '@tabler/icons-react';
import AdminContainer from 'ui-component/AdminContainer';

const MCPSetting = () => {
  const mcpEndpoint = `${window.location.origin}/mcp/v1/message`;
  const sseEndpoint = `${window.location.origin}/mcp/v1/sse`;

  return (
    <>
      <Card>
        <AdminContainer>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconPlugConnected size={24} />
                <Typography variant="h4">MCP Server</Typography>
                <Chip label="Beta" color="primary" size="small" />
              </Stack>

              <Typography variant="body1" color="text.secondary">
                AIHub 可以作为 MCP Server 暴露给 Claude Code、Cursor 等 AI 客户端。
                使用下方的端点地址配置你的 MCP 客户端。
              </Typography>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Streamable HTTP 端点
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'grey.100',
                    p: 1.5,
                    borderRadius: 1,
                    wordBreak: 'break-all'
                  }}
                >
                  {mcpEndpoint}
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  SSE 端点
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'grey.100',
                    p: 1.5,
                    borderRadius: 1,
                    wordBreak: 'break-all'
                  }}
                >
                  {sseEndpoint}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  配置说明
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  1. 在 AI 客户端的 MCP 配置中添加上述端点地址
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. 使用 AIHub 令牌（Bearer Token）进行认证
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. 支持的工具取决于已启用的 MCP 供应商配置
                </Typography>
              </Box>
            </Stack>
          </Box>
        </AdminContainer>
      </Card>
    </>
  );
};

export default MCPSetting;
