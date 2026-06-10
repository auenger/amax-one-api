import { Link } from 'react-router-dom';

// material-ui
import { Divider, Grid, Typography } from '@mui/material';

// project imports
import AuthWrapper from '../AuthWrapper';
import AuthCardWrapper from '../AuthCardWrapper';
import AuthLogin from '../AuthForms/AuthLogin';
import Logo from 'ui-component/Logo';

// ================================|| AUTH - LOGIN ||================================ //

const Login = () => {
  return (
    <AuthWrapper>
      <Grid container direction="column" justifyContent="flex-end">
        <Grid item xs={12}>
          <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: 'calc(100vh - 100px)' }}>
            <Grid item sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
              <AuthCardWrapper>
                <Grid container spacing={2} alignItems="center" justifyContent="center">
                  <Grid item sx={{ mb: 2 }}>
                    <Link to="#">
                      <Logo />
                    </Link>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h2" align="center" sx={{ mb: 0.5 }}>
                      欢迎回来
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      登录您的账户以继续使用 ModelHub
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <AuthLogin />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Grid item container direction="column" alignItems="center" xs={12}>
                      <Typography component={Link} to="/register" variant="subtitle1" sx={{ textDecoration: 'none', fontWeight: 500 }}>
                        还没有账户？立即注册
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </AuthCardWrapper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </AuthWrapper>
  );
};

export default Login;
