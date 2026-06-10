import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const About = () => (
  <Box>
    <Container sx={{ paddingTop: '40px' }}>
      <MainCard title="关于">
        <Typography variant="body2">
          ModelHub
          <br />
          企业级 AI 管理平台
          <br />
          支持 OpenAI 和 Anthropic 双协议
        </Typography>
      </MainCard>
    </Container>
  </Box>
);

export default About;
