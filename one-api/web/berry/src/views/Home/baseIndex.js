import { Box, Typography, Stack } from '@mui/material';

const BaseIndex = () => (
  <Box
    sx={{
      height: 'calc(100vh - 124px)',
      overflow: 'hidden',
      backgroundImage: 'url(/bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: 'white',
      px: 6,
      py: 4,
      display: 'flex',
      alignItems: 'flex-start'
    }}
  >
    <Stack spacing={2} sx={{ mt: '9vh' }}>
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '3rem', md: '4.5rem' },
          lineHeight: 1.2,
          color: '#fff',
          fontWeight: 800,
          textShadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 12px 24px rgba(0,0,0,0.25)',
          letterSpacing: '-0.02em'
        }}
      >
        Amax One API
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontSize: { xs: '1.2rem', md: '1.6rem' },
          lineHeight: 2,
          color: '#fff',
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 12px 24px rgba(0,0,0,0.25)',
          letterSpacing: '0.02em'
        }}
      >
        All in one 的 Amax 模型接入平台
        <br />
        支持 OpenAI 和 Anthropic 双协议
      </Typography>
    </Stack>
  </Box>
);

export default BaseIndex;
