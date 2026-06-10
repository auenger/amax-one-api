import { useSelector } from 'react-redux';

// material-ui
import { styled, useTheme } from '@mui/material/styles';
import {
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from '@mui/material';
import User1 from 'assets/images/users/user-round.svg';
import { useNavigate } from 'react-router-dom';

const CardStyle = styled(Card)(({ theme }) => ({
  background: theme.mode === 'dark'
    ? 'linear-gradient(135deg, ' + theme.palette.primary.dark + ' 0%, ' + theme.palette.secondary.dark + ' 100%)'
    : 'linear-gradient(135deg, ' + theme.palette.primary.main + ' 0%, ' + theme.palette.secondary.main + ' 100%)',
  marginBottom: '16px',
  overflow: 'hidden',
  position: 'relative',
  borderRadius: theme.customization?.borderRadius + 'px',
  boxShadow: theme.mode === 'dark'
    ? 'none'
    : '0 4px 12px rgba(99, 102, 241, 0.2)',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: '120px',
    height: '120px',
    background: 'rgba(255, 255, 255, 0.12)',
    borderRadius: '50%',
    top: '-60px',
    right: '-40px'
  }
}));

// ==============================|| SIDEBAR MENU CARD ||============================== //

const MenuCard = () => {
  const theme = useTheme();
  const account = useSelector((state) => state.account);
  const navigate = useNavigate();

  return (
    <CardStyle>
      <CardContent sx={{ p: 2 }}>
        <List sx={{ p: 0, m: 0 }}>
          <ListItem alignItems="flex-start" disableGutters sx={{ p: 0 }}>
            <ListItemAvatar sx={{ mt: 0 }}>
              <Avatar
                variant="rounded"
                src={User1}
                sx={{
                  ...theme.typography.commonAvatar,
                  ...theme.typography.largeAvatar,
                  color: '#fff',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  marginRight: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/panel/profile')}
              />
            </ListItemAvatar>
            <ListItemText
              sx={{ mt: 0 }}
              primary={
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
                  {account.user?.username}
                </Typography>
              }
              secondary={
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  欢迎回来
                </Typography>
              }
            />
          </ListItem>
        </List>
      </CardContent>
    </CardStyle>
  );
};

export default MenuCard;
