import { TableCell, TableHead, TableRow, Tooltip } from '@mui/material';

const columns = [
  { key: 'time', label: '时间' },
  { key: 'channel', label: '渠道' },
  { key: 'user', label: '用户' },
  { key: 'model', label: '模型' },
  { key: 'stream', label: '流式' },
  { key: 'middleware', label: '中转处理(ms)', tip: '我们平台处理请求的耗时' },
  { key: 'upstream', label: '上游首字节(ms)', tip: '等待供应商返回第一个字节的时间' },
  { key: 'streamMs', label: '数据传输(ms)', tip: '流式数据从供应商回传的时间' },
  { key: 'response', label: '响应回传(ms)', tip: '发送最终响应给客户端的时间' },
  { key: 'total', label: '总耗时(ms)' },
  { key: 'ratio', label: '中转占比', tip: '平台中转处理占总耗时的百分比' },
  { key: 'detail', label: '详情' }
];

const TimingLogTableHead = () => {
  return (
    <TableHead>
      <TableRow>
        {columns.map((col) => (
          <TableCell key={col.key}>
            {col.tip ? (
              <Tooltip title={col.tip}>
                <span>{col.label}</span>
              </Tooltip>
            ) : (
              col.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default TimingLogTableHead;
