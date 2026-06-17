import { Card, useTheme, Stack } from '@mui/material';
import OperationSetting from './component/OperationSetting';
import SystemSetting from './component/SystemSetting';
import AdminContainer from 'ui-component/AdminContainer';

const Setting = () => {
  const theme = useTheme();

  return (
    <>
      <Card sx={{ border: `1px solid ${theme.palette.divider}`, boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}>
        <AdminContainer>
          <Stack spacing={2} sx={{ p: 3 }}>
            <OperationSetting />
            <SystemSetting />
          </Stack>
        </AdminContainer>
      </Card>
    </>
  );
};

export default Setting;
