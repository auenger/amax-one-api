import PropTypes from 'prop-types';

// material-ui
import { Grid, Typography } from '@mui/material';

// third-party
import Chart from 'react-apexcharts';

// project imports
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { Box } from '@mui/material';

// ==============================|| DASHBOARD DEFAULT - TOTAL GROWTH BAR CHART ||============================== //

const StatisticalBarChart = ({ isLoading, chartDatas }) => {
  chartData.options.xaxis.categories = chartDatas.xaxis;
  chartData.series = chartDatas.data;

  return (
    <>
      {isLoading ? (
        <SkeletonTotalGrowthBarChart />
      ) : (
        <MainCard>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Typography variant="h3">统计</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              {chartData.series ? (
                <Chart {...chartData} />
              ) : (
                <Box
                  sx={{
                    minHeight: '490px',
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
      )}
    </>
  );
};

StatisticalBarChart.propTypes = {
  isLoading: PropTypes.bool
};

export default StatisticalBarChart;

const chartData = {
  height: 480,
  type: 'bar',
  options: {
    colors: [
      '#6366f1',
      '#14b8a6',
      '#f97316',
      '#22c55e',
      '#818cf8',
      '#2dd4bf',
      '#fbbf24',
      '#ef4444',
      '#a5b4fc',
      '#5eead4',
      '#fdba74',
      '#86efac',
      '#c084fc',
      '#fde047',
      '#fb923c',
      '#f87171',
      '#99f6e4',
      '#a78bfa',
      '#fca5a5',
      '#93c5fd'
    ],
    chart: {
      id: 'bar-chart',
      stacked: true,
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      },
      background: 'transparent'
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: {
            position: 'bottom',
            offsetX: -10,
            offsetY: 0
          }
        }
      }
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
        borderRadius: 4
      }
    },
    xaxis: {
      type: 'category',
      categories: []
    },
    legend: {
      show: true,
      fontSize: '13px',
      fontFamily: `'Inter', sans-serif`,
      position: 'bottom',
      offsetX: 20,
      labels: {
        useSeriesColors: false,
        colors: '#64748b'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 4
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    fill: {
      type: 'solid'
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      show: true,
      borderColor: '#e2e8f0',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      fixed: {
        enabled: false
      },
      y: {
        formatter: function (val) {
          return '$' + val;
        }
      },
      marker: {
        show: true
      }
    }
  },
  series: []
};
