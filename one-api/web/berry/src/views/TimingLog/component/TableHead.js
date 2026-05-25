import { TableCell, TableHead, TableRow } from '@mui/material';

const TimingLogTableHead = () => {
  return (
    <TableHead>
      <TableRow>
        <TableCell>时间</TableCell>
        <TableCell>渠道</TableCell>
        <TableCell>用户</TableCell>
        <TableCell>模型</TableCell>
        <TableCell>流式</TableCell>
        <TableCell>中间件(ms)</TableCell>
        <TableCell>上游(ms)</TableCell>
        <TableCell>响应(ms)</TableCell>
        <TableCell>总耗时(ms)</TableCell>
        <TableCell>详情</TableCell>
      </TableRow>
    </TableHead>
  );
};

export default TimingLogTableHead;
