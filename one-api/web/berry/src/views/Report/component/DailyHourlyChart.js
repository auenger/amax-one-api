import { useState, useEffect, useMemo } from 'react';
import { Grid, Typography, Box, TextField, Stack, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import { API } from 'utils/api';
import { showError } from 'utils/common';

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
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
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
      </Grid>
    </MainCard>
  );
};

export default DailyHourlyChart;
