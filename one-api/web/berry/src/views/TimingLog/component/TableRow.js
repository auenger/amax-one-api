import PropTypes from 'prop-types';
import { useState } from 'react';

import { TableRow, TableCell, Box, Collapse, IconButton } from '@mui/material';
import { timestamp2string } from 'utils/common';
import Label from 'ui-component/Label';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

function msToColor(ms) {
  if (ms < 100) return 'success';
  if (ms < 500) return 'warning';
  return 'error';
}

function TimingBar({ value, total, color, label }) {
  const width = total > 0 ? Math.max((value / total) * 100, 2) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
      <Box sx={{ width: 80, fontSize: 12, color: 'text.secondary', flexShrink: 0 }}>{label}</Box>
      <Box sx={{ flex: 1, bgcolor: 'grey.200', borderRadius: 1, height: 16, mr: 1, position: 'relative' }}>
        <Box
          sx={{
            width: `${width}%`,
            height: '100%',
            borderRadius: 1,
            bgcolor: `${color}.main`,
            minWidth: 2,
            transition: 'width 0.3s ease'
          }}
        />
      </Box>
      <Box sx={{ width: 60, fontSize: 12, textAlign: 'right', flexShrink: 0 }}>{value} ms</Box>
    </Box>
  );
}

TimingBar.propTypes = {
  value: PropTypes.number,
  total: PropTypes.number,
  color: PropTypes.string,
  label: PropTypes.string
};

export default function TimingLogTableRow({ item, channelMap, expanded, onToggle }) {
  const renderChannel = () => {
    if (!item.channel_id) return '';
    const name = channelMap?.[item.channel_id];
    if (name) return `${name}(#${item.channel_id})`;
    return `渠道#${item.channel_id}`;
  };

  const totalMs = item.total_ms || 1;

  return (
    <>
      <TableRow tabIndex={item.id} hover>
        <TableCell>{timestamp2string(item.created_at)}</TableCell>
        <TableCell>{renderChannel()}</TableCell>
        <TableCell>
          <Label color="default" variant="outlined">
            {item.username || '-'}
          </Label>
        </TableCell>
        <TableCell>
          {item.model_name && (
            <Label color="primary" variant="outlined">
              {item.model_name}
            </Label>
          )}
        </TableCell>
        <TableCell>{item.is_stream ? '是' : '否'}</TableCell>
        <TableCell>
          <Label color={msToColor(item.middleware_ms)} variant="filled">
            {item.middleware_ms}
          </Label>
        </TableCell>
        <TableCell>
          <Label color={msToColor(item.upstream_ms)} variant="filled">
            {item.upstream_ms}
          </Label>
        </TableCell>
        <TableCell>
          <Label color={msToColor(item.stream_ms)} variant="filled">
            {item.stream_ms}
          </Label>
        </TableCell>
        <TableCell>
          <Label color={msToColor(item.response_ms)} variant="filled">
            {item.response_ms}
          </Label>
        </TableCell>
        <TableCell>
          <Label color={msToColor(item.total_ms)} variant="filled">
            {item.total_ms}
          </Label>
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={onToggle}>
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </IconButton>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={11} sx={{ py: 1, bgcolor: 'grey.50' }}>
            <Box sx={{ px: 2 }}>
              <TimingBar value={item.middleware_ms} total={totalMs} color="info" label="中间件" />
              <TimingBar value={item.upstream_ms} total={totalMs} color="warning" label="上游(TTFB)" />
              <TimingBar value={item.stream_ms} total={totalMs} color="secondary" label="流式传输" />
              <TimingBar value={item.response_ms} total={totalMs} color="success" label="响应" />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, fontSize: 11, color: 'text.secondary' }}>
                令牌: {item.token_name || '-'} | 请求ID: {item.request_id || '-'}
              </Box>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

TimingLogTableRow.propTypes = {
  item: PropTypes.object,
  channelMap: PropTypes.object,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func
};
