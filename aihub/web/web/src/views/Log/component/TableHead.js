import PropTypes from 'prop-types';
import { TableCell, TableHead, TableRow, Tooltip } from '@mui/material';

const LogTableHead = ({ userIsAdmin }) => {
  return (
    <TableHead>
      <TableRow>
        <TableCell>时间</TableCell>
        <TableCell>渠道</TableCell>
        {userIsAdmin && <TableCell>用户</TableCell>}
        <TableCell>令牌</TableCell>
        <TableCell>类型</TableCell>
        <TableCell>模型</TableCell>
        <TableCell>提示</TableCell>
        <TableCell>补全</TableCell>
        <TableCell>额度</TableCell>
        <TableCell>
          <Tooltip title="请求从进入到响应的总耗时">
            <span>总耗时</span>
          </Tooltip>
        </TableCell>
        <TableCell>
          <Tooltip title="平台中转处理耗时（不含上游等待）">
            <span>中转开销</span>
          </Tooltip>
        </TableCell>
        <TableCell>详情</TableCell>
      </TableRow>
    </TableHead>
  );
};

export default LogTableHead;

LogTableHead.propTypes = {
  userIsAdmin: PropTypes.bool
};
