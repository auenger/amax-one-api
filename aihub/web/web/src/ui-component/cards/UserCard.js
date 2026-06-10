/*
 * UserCard.js — Modern gradient profile card for ModelHub
 *
 * Originally based on Minimal UI (MIT License)
 * https://github.com/minimal-ui-kit/material-kit-react
 */
import { Box, Avatar, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';

import React from 'react';

export default function UserCard({ children }) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark'
          ? 'none'
          : '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)'
      }}
    >
      {/* Gradient header */}
      <Box
        sx={{
          position: 'relative',
          height: 120,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
            : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            top: -40,
            right: -40
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            bottom: -30,
            left: -30
          }}
        />
        {/* Avatar */}
        <Avatar
          sx={{
            width: 64,
            height: 64,
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '3px solid rgba(255,255,255,0.4)',
            fontSize: '1.5rem',
            fontWeight: 700,
            zIndex: 1
          }}
        >
          U
        </Avatar>
      </Box>
      {/* Content */}
      <Box sx={{ p: 2.5, pt: 2 }}>
        {children}
      </Box>
    </Card>
  );
}
