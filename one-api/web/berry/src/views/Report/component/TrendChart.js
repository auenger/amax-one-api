import PropTypes from 'prop-types';
import { Grid, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { calculateQuota } from 'utils/common';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

const TrendChart = ({ isLoading, data }) => {
  if (isLoading) {
    return <SkeletonTotalGrowthBarChart />;
  }

  const dates = data.map((item) => item.date);
  const requests = data.map((item) => item.requests);
  const promptTokens = data.map((item) => item.prompt_tokens);
  const completionTokens = data.map((item) => item.completion_tokens);
  const quotaData = data.map((item) => parseFloat(calculateQuota(item.quota, 3)));

  const chartOptions = {
    chart: {
      id: 'usage-trend-chart',
      toolbar: { show: true },
      zoom: { enabled: true },
      background: 'transparent'
    },
    colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: [3, 3, 3, 2]
    },
    xaxis: {
      categories: dates,
      type: 'category'
    },
    yaxis: [
      {
        title: { text: '请求次数' },
        labels: { formatter: (val) => val }
      },
      {
        title: { text: 'Token 数' },
        labels: { formatter: (val) => val },
        show: true
      },
      {
        show: false
      },
      {
        opposite: true,
        title: { text: '费用 ($)' },
        labels: { formatter: (val) => '$' + val }
      }
    ],
    tooltip: {
      theme: 'dark',
      y: {
        formatter: function (val, opts) {
          if (opts.seriesIndex === 3) return '$' + val;
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
    fill: { type: 'solid', opacity: 1 }
  };

  const series = [
    { name: '请求数', type: 'column', data: requests },
    { name: 'Prompt Tokens', type: 'line', data: promptTokens },
    { name: 'Completion Tokens', type: 'line', data: completionTokens },
    { name: '费用', type: 'line', data: quotaData }
  ];

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
          {data.length > 0 ? (
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
  data: PropTypes.array
};

export default TrendChart;
