import React from 'react';
import { Box, Container, Card, CardContent, Typography, Button, Stack, Chip } from '@mui/material';
import { IconBrandApple, IconBrandWindows } from '@tabler/icons-react';

const MAC_FILE = '/CC-Switch-v3.15.0-macOS.dmg';
const WIN_FILE = '/CC-Switch-v3.15.0-Windows.msi';

function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Mac')) return 'mac';
  if (ua.includes('Windows')) return 'win';
  return 'unknown';
}

const Download = () => {
  const os = detectOS();

  const cards = [
    {
      id: 'mac',
      label: 'macOS',
      icon: <IconBrandApple size={40} />,
      file: MAC_FILE,
      fileName: 'CC-Switch-v3.15.0-macOS.dmg',
      hint: '支持 Intel / Apple Silicon',
      recommended: os === 'mac'
    },
    {
      id: 'win',
      label: 'Windows',
      icon: <IconBrandWindows size={40} />,
      file: WIN_FILE,
      fileName: 'CC-Switch-v3.15.0-Windows.msi',
      hint: 'Windows 10 及以上',
      recommended: os === 'win'
    }
  ];

  return (
    <Box>
      <Container maxWidth="sm" sx={{ paddingTop: '60px', paddingBottom: '60px' }}>
        <Typography variant="h3" align="center" gutterBottom fontWeight={600}>
          下载 CC Switch
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 5 }}>
          选择适合您操作系统的版本
        </Typography>

        <Stack spacing={3}>
          {cards.map((c) => (
            <Card
              key={c.id}
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: c.recommended ? 'primary.main' : 'divider',
                borderWidth: c.recommended ? 2 : 1,
                position: 'relative',
                transition: 'border-color 0.2s'
              }}
            >
              {c.recommended && (
                <Chip
                  label="推荐"
                  color="primary"
                  size="small"
                  sx={{ position: 'absolute', top: 12, right: 12 }}
                />
              )}
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 3.5 }}>
                <Box sx={{ color: 'primary.main', display: 'flex' }}>{c.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={500}>
                    {c.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.hint}
                  </Typography>
                </Box>
                <Button
                  component="a"
                  href={c.file}
                  download={c.fileName}
                  variant={c.recommended ? 'contained' : 'outlined'}
                  size="large"
                >
                  下载
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};

export default Download;
