import PropTypes from 'prop-types';

// material-ui
import { useTheme } from '@mui/material/styles';
import { Avatar, Box, ButtonBase, InputBase } from '@mui/material';

// project imports
import LogoSection from '../LogoSection';
import ProfileSection from './ProfileSection';
import ThemeButton from 'ui-component/ThemeButton';

// assets
import { IconMenu2, IconSearch } from '@tabler/icons-react';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

const Header = ({ handleLeftDrawerToggle }) => {
  const theme = useTheme();

  return (
    <>
      {/* logo & toggler button */}
      <Box
        sx={{
          width: 228,
          display: 'flex',
          alignItems: 'center',
          [theme.breakpoints.down('md')]: {
            width: 'auto'
          }
        }}
      >
        <Box component="span" sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
          <LogoSection />
        </Box>
        <ButtonBase sx={{ borderRadius: '8px', overflow: 'hidden' }}>
          <Avatar
            variant="rounded"
            sx={{
              ...theme.typography.commonAvatar,
              ...theme.typography.mediumAvatar,
              ...theme.typography.menuButton,
              transition: 'all .2s ease-in-out',
              background: theme.palette.mode === 'dark'
                ? theme.palette.dark.main
                : theme.palette.primary.light,
              color: theme.palette.mode === 'dark'
                ? theme.palette.primary.light
                : theme.palette.primary.main,
              '&:hover': {
                background: theme.palette.primary.main,
                color: '#fff'
              }
            }}
            onClick={handleLeftDrawerToggle}
            color="inherit"
          >
            <IconMenu2 stroke={1.5} size="1.3rem" />
          </Avatar>
        </ButtonBase>
      </Box>

      {/* search bar */}
      <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            alignItems: 'center',
            bgcolor: theme.palette.mode === 'dark'
              ? theme.palette.dark.main
              : theme.palette.grey[100],
            borderRadius: '8px',
            px: 1.5,
            py: 0.5,
            '&:focus-within': {
              bgcolor: theme.palette.mode === 'dark'
                ? theme.palette.dark.dark
                : theme.palette.grey[50],
              boxShadow: '0 0 0 2px ' + theme.palette.primary.main + '20'
            }
          }}
        >
          <IconSearch size="1rem" color={theme.palette.grey[400]} style={{ marginRight: 8 }} />
          <InputBase
            placeholder="搜索... (Ctrl+K)"
            sx={{
              flex: 1,
              fontSize: '0.875rem',
              color: theme.palette.text.primary,
              '& input::placeholder': {
                color: theme.palette.grey[400],
                opacity: 1
              }
            }}
          />
          <Box
            component="span"
            sx={{
              fontSize: '0.6875rem',
              color: theme.palette.grey[400],
              bgcolor: theme.palette.mode === 'dark'
                ? 'rgba(148, 163, 184, 0.15)'
                : theme.palette.grey[200],
              px: 0.75,
              py: 0.25,
              borderRadius: '4px',
              fontWeight: 600
            }}
          >
            ⌘K
          </Box>
        </Box>
      </Box>

      {/* right side actions */}
      <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ThemeButton />
        <Box
          sx={{
            width: 1,
            height: 24,
            bgcolor: theme.palette.divider,
            mx: 0.5,
            display: { xs: 'none', sm: 'block' }
          }}
        />
        <ProfileSection />
      </Box>
    </>
  );
};

Header.propTypes = {
  handleLeftDrawerToggle: PropTypes.func
};

export default Header;
