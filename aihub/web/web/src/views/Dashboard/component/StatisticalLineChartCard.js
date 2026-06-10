import PropTypes from 'prop-types';

// material-ui
import { styled } from '@mui/material/styles';
import { Box, Grid, Typography } from '@mui/material';

// third-party
import Chart from 'react-apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalOrderCard from 'ui-component/cards/Skeleton/EarningCard';

const CardWrapper = styled(MainCard)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.dark.dark : theme.palette.primary.dark,
  backgroundImage:
    theme.palette.mode === 'dark'
      ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
      : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: '#fff',
  overflow: 'hidden',
  position: 'relative',
  borderRadius: `${theme.customization.borderRadius}px`,
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 4px 20px 0 rgba(0,0,0,0.3)'
      : '0 4px 20px 0 rgba(99,102,241,0.25)',
  '&>div': {
    position: 'relative',
    zIndex: 5
  },
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 240,
    height: 240,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '50%',
    zIndex: 1,
    top: -100,
    right: -110,
    [theme.breakpoints.down('sm')]: {
      top: -120,
      right: -150
    }
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    zIndex: 1,
    width: 180,
    height: 180,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '50%',
    top: -90,
    right: 20,
    [theme.breakpoints.down('sm')]: {
      top: -130,
      right: -40
    }
  }
}));

// ==============================|| DASHBOARD - TOTAL ORDER LINE CHART CARD ||============================== //

const StatisticalLineChartCard = ({ isLoading, title, chartData, todayValue }) => {
  return (
    <>
      {isLoading ? (
        <SkeletonTotalOrderCard />
      ) : (
        <CardWrapper border={false} content={false}>
          <Box sx={{ p: 2.5 }}>
            <Grid container direction="column" spacing={1.5}>
              <Grid item>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                    letterSpacing: '0.02em'
                  }}
                >
                  {title}
                </Typography>
              </Grid>
              <Grid item>
                <Grid container alignItems="flex-end" justifyContent="space-between">
                  <Grid item xs={7}>
                    <Typography
                      sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: '#fff'
                      }}
                    >
                      {todayValue || '0'}
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    {chartData ? (
                      <Chart {...chartData} />
                    ) : (
                      <Typography
                        sx={{
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.5)',
                          textAlign: 'right'
                        }}
                      >
                        暂无数据
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </CardWrapper>
      )}
    </>
  );
};

StatisticalLineChartCard.propTypes = {
  isLoading: PropTypes.bool,
  title: PropTypes.string,
  chartData: PropTypes.object,
  todayValue: PropTypes.string
};

export default StatisticalLineChartCard;
