import PropTypes from 'prop-types';
import { Grid, Typography, Box } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { renderNumber, calculateQuota } from 'utils/common';
import SkeletonTotalOrderCard from 'ui-component/cards/Skeleton/EarningCard';

const CardWrapper = styled(MainCard)(({ theme, bgcolor }) => ({
  ...theme.typography.CardWrapper,
  color: '#fff',
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: bgcolor || theme.palette.primary.dark,
  '&>div': {
    position: 'relative',
    zIndex: 5
  },
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: bgcolor ? `${bgcolor}cc` : theme.palette.primary[800],
    borderRadius: '50%',
    zIndex: 1,
    top: -85,
    right: -95,
    [theme.breakpoints.down('sm')]: {
      top: -105,
      right: -140
    }
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    zIndex: 1,
    width: 210,
    height: 210,
    background: bgcolor ? `${bgcolor}cc` : theme.palette.primary[800],
    borderRadius: '50%',
    top: -125,
    right: -15,
    opacity: 0.5,
    [theme.breakpoints.down('sm')]: {
      top: -155,
      right: -70
    }
  }
}));

const SummaryCards = ({ isLoading, summary }) => {
  const theme = useTheme();

  const cards = [
    {
      title: '总请求数',
      value: summary ? renderNumber(summary.total_requests) : '0',
      bgcolor: theme.palette.primary.dark
    },
    {
      title: '总 Token 用量',
      value: summary ? renderNumber(summary.total_prompt_tokens + summary.total_completion_tokens) : '0',
      bgcolor: theme.palette.success.dark
    },
    {
      title: '总费用',
      value: summary ? '$' + calculateQuota(summary.total_quota) : '$0',
      bgcolor: theme.palette.warning.dark
    }
  ];

  return (
    <Grid container spacing={gridSpacing}>
      {cards.map((card, index) => (
        <Grid item lg={4} xs={12} key={index}>
          {isLoading ? (
            <SkeletonTotalOrderCard />
          ) : (
            <CardWrapper border={false} content={false} bgcolor={card.bgcolor}>
              <Box sx={{ p: 2.25 }}>
                <Grid container alignItems="center">
                  <Grid item xs={12}>
                    <Typography
                      sx={{
                        fontSize: '2.125rem',
                        fontWeight: 500,
                        mr: 1,
                        mt: 1.75,
                        mb: 0.75
                      }}
                    >
                      {card.value}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: theme.palette.primary[200]
                      }}
                    >
                      {card.title}
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
