import PropTypes from 'prop-types';
import { Grid, Typography, Box } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { renderNumber, calculateQuota } from 'utils/common';
import SkeletonTotalOrderCard from 'ui-component/cards/Skeleton/EarningCard';
import { IconMessage2, IconCoins, IconChartBar } from '@tabler/icons-react';

const CardWrapper = styled(MainCard)(({ theme, bgcolor }) => ({
  backgroundColor: bgcolor || theme.palette.primary.dark,
  backgroundImage: `linear-gradient(135deg, ${bgcolor || theme.palette.primary.main} 0%, ${bgcolor || theme.palette.primary.dark} 100%)`,
  color: '#fff',
  overflow: 'hidden',
  position: 'relative',
  borderRadius: `${theme.customization.borderRadius}px`,
  '&>div': {
    position: 'relative',
    zIndex: 5
  },
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 200,
    height: 200,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '50%',
    zIndex: 1,
    top: -80,
    right: -100,
    [theme.breakpoints.down('sm')]: {
      top: -100,
      right: -130
    }
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    zIndex: 1,
    width: 160,
    height: 160,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '50%',
    top: -80,
    right: 20,
    [theme.breakpoints.down('sm')]: {
      top: -140,
      right: -50
    }
  }
}));

const SummaryCards = ({ isLoading, summary }) => {
  const theme = useTheme();

  const cards = [
    {
      title: '总请求数',
      value: summary ? renderNumber(summary.total_requests) : '0',
      bgcolor: theme.palette.primary.dark,
      icon: <IconChartBar size={28} stroke={1.5} />,
      gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
    },
    {
      title: '总 Token 用量',
      value: summary ? renderNumber(summary.total_prompt_tokens + summary.total_completion_tokens) : '0',
      bgcolor: theme.palette.success.dark,
      icon: <IconMessage2 size={28} stroke={1.5} />,
      gradient: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
    },
    {
      title: '总费用',
      value: summary ? '$' + calculateQuota(summary.total_quota) : '$0',
      bgcolor: theme.palette.warning.dark,
      icon: <IconCoins size={28} stroke={1.5} />,
      gradient: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.orange.dark} 100%)`
    }
  ];

  return (
    <Grid container spacing={gridSpacing}>
      {cards.map((card, index) => (
        <Grid item lg={4} xs={12} key={index}>
          {isLoading ? (
            <SkeletonTotalOrderCard />
          ) : (
            <CardWrapper border={false} content={false} bgcolor={card.gradient}>
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
                      {card.title}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Typography
                      sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: '#fff'
                      }}
                    >
                      {card.value}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardWrapper>
          )}
        </Grid>
      ))}
    </Grid>
  );
};

SummaryCards.propTypes = {
  isLoading: PropTypes.bool,
  summary: PropTypes.object
};

export default SummaryCards;
