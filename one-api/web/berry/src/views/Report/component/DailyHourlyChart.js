import { useState, useEffect, useMemo } from 'react';
import {
  Grid,
  Typography,
  Box,
  TextField,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  useTheme
} from '@mui/material';
import Chart from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import { API } from 'utils/api';
import { showError, calculateQuota, renderNumber } from 'utils/common';

const USER_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#00D9E9', '#FF66C3', '#9C27B0'];

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DailyHourlyChart = () => {
  const theme = useTheme();
  const [date, setDate] = useState(getToday());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- table state ---
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(25);
  const [tableOrder, setTableOrder] = useState('asc');
  const [tableOrderBy, setTableOrderBy] = useState('quota');

  const loadData = async (selectedDate) => {
    setLoading(true);
    try {
      const params = { date: selectedDate };
      const res = await API.get('/api/user/report/daily', { params });
      const { success, message, data: resData } = res.data;
      if (success) {
        setData(resData);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(date);
  }, [date]);

  useEffect(() => {
    setTablePage(0);
  }, [data]);

  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  const { tokenSeries, requestSeries, chartOptions } = useMemo(() => {
    if (!data || !data.usernames || data.usernames.length === 0) {
      return { tokenSeries: [], requestSeries: [], chartOptions: {} };
    }

    const hours = data.hours || [];
    const rows = data.by_user_hourly || [];
    const usernames = data.usernames;

    const userHourMap = {};
    rows.forEach((row) => {
      if (!userHourMap[row.username]) {
        userHourMap[row.username] = {};
      }
      userHourMap[row.username][row.date] = row;
    });

    const tokenSeriesData = usernames.map((username) => ({
      name: username,
      data: hours.map((hour) => {
        const row = userHourMap[username]?.[hour];
        return row ? row.prompt_tokens + row.completion_tokens : 0;
      })
    }));

    const requestSeriesData = usernames.map((username) => ({
      name: username,
      data: hours.map((hour) => {
        const row = userHourMap[username]?.[hour];
        return row ? row.requests : 0;
      })
    }));

    const baseOptions = {
      chart: {
        toolbar: { show: true },
        zoom: { enabled: true },
        background: 'transparent'
      },
      colors: usernames.map((_, i) => USER_COLORS[i % USER_COLORS.length]),
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      markers: { size: 3, hover: { size: 6 } },
      xaxis: {
        categories: hours,
        type: 'category',
        labels: {
          rotate: -45,
          rotateAlways: true,
          hideOverlappingLabels: true,
          style: { colors: theme.palette.mode === 'dark' ? '#ccc' : '#666' }
        }
      },
      tooltip: { theme: theme.palette.mode === 'dark' ? 'dark' : 'light' },
      legend: { show: true, position: 'bottom', horizontalAlign: 'center' },
      grid: { show: true },
      theme: { mode: theme.palette.mode }
    };

    return { tokenSeries: tokenSeriesData, requestSeries: requestSeriesData, chartOptions: baseOptions };
  }, [data, theme.palette.mode]);

  const handleTableSort = (property) => {
    const isAsc = tableOrderBy === property && tableOrder === 'asc';
    setTableOrder(isAsc ? 'desc' : 'asc');
    setTableOrderBy(property);
  };

  const tableRows = useMemo(() => {
    if (!data || !data.by_user_hourly) return [];
    const agg = {};
    data.by_user_hourly.forEach((row) => {
      if (!agg[row.username]) {
        agg[row.username] = { username: row.username, requests: 0, prompt_tokens: 0, completion_tokens: 0, quota: 0 };
      }
      agg[row.username].requests += row.requests;
      agg[row.username].prompt_tokens += row.prompt_tokens;
      agg[row.username].completion_tokens += row.completion_tokens;
      agg[row.username].quota += row.quota;
    });
    return Object.values(agg);
  }, [data]);

  const sortedTableRows = useMemo(() => {
    const comparator =
      tableOrder === 'desc'
        ? (a, b) => (b[tableOrderBy] < a[tableOrderBy] ? -1 : b[tableOrderBy] > a[tableOrderBy] ? 1 : 0)
        : (a, b) => (a[tableOrderBy] < b[tableOrderBy] ? -1 : a[tableOrderBy] > b[tableOrderBy] ? 1 : 0);
    return [...tableRows].sort(comparator);
  }, [tableRows, tableOrder, tableOrderBy]);

  if (loading) {
    return <SkeletonTotalGrowthBarChart />;
  }

  const hasData = data && data.usernames && data.usernames.length > 0;
  const noDataBox = (
    <Box sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h3" color="#697586">
        暂无数据
      </Typography>
    </Box>
  );

  const tableHeadCells = [
    { id: 'username', label: '用户名', sortable: true },
    { id: 'requests', label: '请求次数', sortable: true },
    { id: 'prompt_tokens', label: 'Prompt Tokens', sortable: true },
    { id: 'completion_tokens', label: 'Completion Tokens', sortable: true },
    { id: 'quota', label: '费用', sortable: true }
  ];

  const paginatedTableRows = sortedTableRows.slice(tablePage * tableRowsPerPage, tablePage * tableRowsPerPage + tableRowsPerPage);

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h3">当日24小时用量</Typography>
            <TextField
              type="date"
              value={date}
              onChange={handleDateChange}
              size="small"
              inputProps={{ max: getToday() }}
              sx={{ width: 180 }}
            />
          </Stack>
        </Grid>
        {/* Token 用量图 - 100% 宽度 */}
        <Grid item xs={12}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Token 用量
          </Typography>
          {hasData ? (
            <Chart
              options={{
                ...chartOptions,
                chart: { ...chartOptions.chart, id: 'daily-hourly-tokens' },
                yaxis: {
                  title: { text: 'Token 数' },
                  labels: {
                    formatter: (val) => (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val),
                    style: { colors: theme.palette.mode === 'dark' ? '#ccc' : '#666' }
                  }
                }
              }}
              series={tokenSeries}
              type="line"
              height={350}
            />
          ) : (
            noDataBox
          )}
        </Grid>
        {/* 请求次数图 - 100% 宽度 */}
        <Grid item xs={12}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            请求次数
          </Typography>
          {hasData ? (
            <Chart
              options={{
                ...chartOptions,
                chart: { ...chartOptions.chart, id: 'daily-hourly-requests' },
                yaxis: {
                  title: { text: '请求次数' },
                  labels: {
                    formatter: (val) => val,
                    style: { colors: theme.palette.mode === 'dark' ? '#ccc' : '#666' }
                  }
                }
              }}
              series={requestSeries}
              type="line"
              height={350}
            />
          ) : (
            noDataBox
          )}
        </Grid>
        {/* 当日24小时用量明细表 */}
        <Grid item xs={12}>
          <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
            24小时用量明细
          </Typography>
          {hasData ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {tableHeadCells.map((headCell) => (
                      <TableCell key={headCell.id} sortDirection={tableOrderBy === headCell.id ? tableOrder : false}>
                        {headCell.sortable ? (
                          <TableSortLabel
                            active={tableOrderBy === headCell.id}
                            direction={tableOrderBy === headCell.id ? tableOrder : 'asc'}
                            onClick={() => handleTableSort(headCell.id)}
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
                  {paginatedTableRows.length > 0 ? (
                    paginatedTableRows.map((row, index) => (
                      <TableRow hover key={`${row.username}_${index}`}>
                        <TableCell>{row.username || '-'}</TableCell>
                        <TableCell>{renderNumber(row.requests)}</TableCell>
                        <TableCell>{renderNumber(row.prompt_tokens)}</TableCell>
                        <TableCell>{renderNumber(row.completion_tokens)}</TableCell>
                        <TableCell>{'$' + calculateQuota(row.quota)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={tableHeadCells.length} align="center">
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
                count={tableRows.length}
                page={tablePage}
                onPageChange={(_, newPage) => setTablePage(newPage)}
                rowsPerPage={tableRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setTableRowsPerPage(parseInt(e.target.value, 10));
                  setTablePage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="每页行数"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
              />
            </TableContainer>
          ) : (
            noDataBox
          )}
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default DailyHourlyChart;
