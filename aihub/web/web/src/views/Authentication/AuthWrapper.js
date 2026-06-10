// material-ui
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { useEffect, useContext } from 'react';
import { UserContext } from 'contexts/UserContext';
import { useTheme } from '@mui/material/styles';

// ==============================|| AUTHENTICATION WRAPPER ||============================== //

const AuthStyle = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  backgroundImage:
    theme.palette.mode === 'dark'
      ? `radial-gradient(circle at 20% 50%, ${theme.palette.primary.dark}22 0%, transparent 50%),
         radial-gradient(circle at 80% 20%, ${theme.palette.secondary.dark}22 0%, transparent 50%)`
      : `radial-gradient(circle at 20% 50%, ${theme.palette.primary.light} 0%, transparent 50%),
         radial-gradient(circle at 80% 20%, ${theme.palette.secondary.light} 0%, transparent 50%)`,
  minHeight: '100vh'
}));

// eslint-disable-next-line
const AuthWrapper = ({ children }) => {
  const account = useSelector((state) => state.account);
  const { isUserLoaded } = useContext(UserContext);
  const navigate = useNavigate();
  useEffect(() => {
    if (isUserLoaded && account.user) {
      navigate('/panel');
    }
  }, [account, navigate, isUserLoaded]);

  return <AuthStyle> {children} </AuthStyle>;
};

export default AuthWrapper;
