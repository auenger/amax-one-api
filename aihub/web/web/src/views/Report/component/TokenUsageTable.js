import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { calculateQuota, renderNumber } from 'utils/common';

const headCells = [
  { id: 'token_name', label: '令牌名称', sortable: true },
  { id: 'requests', label: '调用次数', sortable: true },
  { id: 'prompt_tokens', label: 'Prompt Tokens', sortable: true },
  { id: 'completion_tokens', label: 'Completion Tokens', sortable: true },
  { id: 'quota', label: '费用', sortable: true }
];

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const TokenUsageTable = ({ isLoading, data }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('quota');

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [data]);

  const sortedData = [...data].sort(getComparator(order, orderBy));
  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <MainCard>
      <Typography variant="h3" sx={{ mb: 2 }}>
        令牌用量明细
      </Typography>
      {isLoading ? (
        <LinearProgress />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {headCells.map((headCell) => (
                  <TableCell key={headCell.id} sortDirection={orderBy === headCell.id ? order : false}>
                    {headCell.sortable ? (
                      <TableSortLabel
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={() => handleSort(headCell.id)}
                      >
                        {headCell.label}
                      </TableSortLabel>
                    ) : (
                      headCell.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow hover key={`${row.token_name}_${index}`}>
                    <TableCell>{row.token_name || '-'}</TableCell>
                    <TableCell>{renderNumber(row.requests)}</TableCell>
                    <TableCell>{renderNumber(row.prompt_tokens)}</TableCell>
                    <TableCell>{renderNumber(row.completion_tokens)}</TableCell>
                    <TableCell>{'$' + calculateQuota(row.quota)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center">
                    <Typography variant="body1" color="textSecondary" sx={{ py: 3 }}>
                      暂无数据
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={data.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="每页行数"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
          />
        </TableContainer>
      )}
    </MainCard>
  );
};

TokenUsageTable.propTypes = {
  isLoading: PropTypes.bool,
  data: PropTypes.array
};

export default TokenUsageTable;
