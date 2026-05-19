import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Grid, Typography, Box, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

// Color palette for different users
const USER_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#00D9E9', '#FF66C3', '#9C27B0'];

const TrendChart = ({ isLoading, data, dataByUser, granularity }) => {
  const theme = useTheme();
  const isHourGranularity = granularity === 'hour';

  const { chartOptions, series, allDates } = useMemo(() => {
    const xaxisConfig = (dates) => ({
      categories: dates,
      type: 'category',
      labels: {
        rotate: isHourGranularity ? -45 : 0,
        rotateAlways: isHourGranularity,
        hideOverlappingLabels: isHourGranularity,
        style: {
          colors: theme.palette.mode === 'dark' ? '#ccc' : '#666'
        }
      }
    });

    // If we have by_date_user data, use multi-user lines
    if (dataByUser && dataByUser.length > 0) {
      const dateSet = new Set();
      const userMap = {};

      dataByUser.forEach((row) => {
        dateSet.add(row.date);
        if (!userMap[row.username]) {
          userMap[row.username] = {};
        }
        userMap[row.username][row.date] = row;
      });

      const dates = Array.from(dateSet).sort();
      const usernames = Object.keys(userMap).sort();

      const seriesData = [];
      const colors = [];

      usernames.forEach((username, userIndex) => {
        const baseColor = USER_COLORS[userIndex % USER_COLORS.length];

        seriesData.push({
          name: `${username} - Tokens`,
          data: dates.map((date) => {
            const row = userMap[username][date];
            return row ? row.prompt_tokens + row.completion_tokens : 0;
          })
        });
        colors.push(baseColor);

        seriesData.push({
          name: `${username} - 请求数`,
          data: dates.map((date) => {
            const row = userMap[username][date];
            return row ? row.requests : 0;
          })
        });
        colors.push(baseColor);
      });

      const options = {
        chart: {
          id: 'usage-trend-chart',
          toolbar: { show: true },
          zoom: { enabled: true },
          background: 'transparent'
        },
        colors: colors,
        dataLabels: { enabled: false },
        stroke: {
          curve: 'smooth',
          width: usernames.map((_, i) => {
            const baseIdx = i * 2;
            return baseIdx % 4 < 2 ? 3 : 2;
          }),
          dashArray: usernames.reduce((acc, _) => {
            acc.push(0);
            acc.push(5);
            return acc;
          }, [])
        },
        markers: {
          size: 3,
          hover: { size: 6 }
        },
        xaxis: xaxisConfig(dates),
        yaxis: [
          {
            title: { text: 'Token 数' },
            labels: {
              formatter: (val) => (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val),
              style: { colors: theme.palette.mode === 'dark' ? '#ccc' : '#666' }
            }
          },
          {
            opposite: true,
            title: { text: '请求次数' },
            labels: {
              formatter: (val) => val,
              style: { colors: theme.palette.mode === 'dark' ? '#ccc' : '#666' }
            }
          }
        ],
        tooltip: {
          theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
          y: {
            formatter: function (val) {
              return val;
            }
          }
        },
        legend: {
          show: true,
          position: 'bottom',
          horizontalAlign: 'center'
        },
        grid: { show: true },
        theme: { mode: theme.palette.mode }
      };

      seriesData.forEach((s, i) => {
        s.type = 'line';
      });

      return { chartOptions: options, series: seriesData, allDates: dates };
    }

    // Fallback: single-user data (from by_date)
    const dates = data.map((item) => item.date);
    const requests = data.map((item) => item.requests);
    const tokens = data.map((item) => item.prompt_tokens + item.completion_tokens);

    const options = {
      chart: {
        id: 'usage-trend-chart',
        toolbar: { show: true },
        zoom: { enabled: true },
        background: 'transparent'
      },
      colors: ['#008FFB', '#00E396'],
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: [3, 3]
      },
      markers: {
        size: 3,
        hover: { size: 6 }
      },
      xaxis: xaxisConfig(dates),
      yaxis: [
        {
          title: { text: 'Token 数' },
          labels: {
            formatter: (val) => (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val),
            style: { colors: theme.palette.mode === 'dark' ? '#ccc' : '#666' }
          }
        },
        {
          opposite: true,
          title: { text: '请求次数' },
          labels: {
            formatter: (val) => val,
            style: { colors: theme.palette.mode === 'dark' ? '#ccc' : '#666' }
          }
        }
      ],
      tooltip: {
        theme: theme.palette.mode === 'dark' ? 'dark' : 'light'
      },
      legend: {
        show: true,
        position: 'bottom',
        horizontalAlign: 'center'
      },
      grid: { show: true },
      theme: { mode: theme.palette.mode }
    };

    const seriesData = [
      { name: 'Tokens', type: 'line', data: tokens },
      { name: '请求数', type: 'line', data: requests }
    ];

    return { chartOptions: options, series: seriesData, allDates: dates };
  }, [data, dataByUser, theme.palette.mode, isHourGranularity]);

  if (isLoading) {
    return <SkeletonTotalGrowthBarChart />;
  }

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h3">用量趋势</Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          {series.length > 0 && allDates.length > 0 ? (
            <Chart options={chartOptions} series={series} type="line" height={400} />
          ) : (
            <Box
              sx={{
                minHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="h3" color={'#697586'}>
                暂无数据
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </MainCard>
  );
};

TrendChart.propTypes = {
  isLoading: PropTypes.bool,
  data: PropTypes.array,
  dataByUser: PropTypes.array,
  granularity: PropTypes.string
};

export default TrendChart;
