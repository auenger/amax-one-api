import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import {
  IconUser,
  IconKey
} from '@tabler/icons-react';
import {
  InputAdornment,
  OutlinedInput,
  Stack,
  FormControl,
  InputLabel,
  Card,
  Box
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
require('dayjs/locale/zh-cn');

export default function ReportFilter({ filter, handleFilterChange, handleFilterDateChange }) {
  const theme = useTheme();
  const grey500 = theme.palette.grey[500];

  return (
    <Card>
      <Box sx={{ padding: '24px 24px 0 24px' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 3, sm: 2, md: 4 }}
        >
          <FormControl>
            <InputLabel htmlFor="report-username-label">用户名称</InputLabel>
            <OutlinedInput
              id="username"
              name="username"
              sx={{ minWidth: '100%' }}
              label="用户名称"
              value={filter.username}
              onChange={handleFilterChange}
              placeholder="用户名称"
              startAdornment={
                <InputAdornment position="start">
                  <IconUser stroke={1.5} size="20px" color={grey500} />
                </InputAdornment>
              }
            />
          </FormControl>

          <FormControl>
            <InputLabel htmlFor="report-token-name-label">令牌名称（逗号分隔多选）</InputLabel>
            <OutlinedInput
              id="token_name"
              name="token_name"
              sx={{ minWidth: '100%' }}
              label="令牌名称（逗号分隔多选）"
              value={filter.token_name}
              onChange={handleFilterChange}
              placeholder="如 key-1,key-2"
              startAdornment={
                <InputAdornment position="start">
                  <IconKey stroke={1.5} size="20px" color={grey500} />
                </InputAdornment>
              }
            />
          </FormControl>

          <FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
              <DateTimePicker
                label="起始时间"
                ampm={false}
                name="start_timestamp"
                value={filter.start_timestamp ? dayjs.unix(filter.start_timestamp) : null}
                onChange={(value) => {
                  if (value === null) {
                    handleFilterDateChange('start_timestamp', 0);
                    return;
                  }
                  handleFilterDateChange('start_timestamp', value.unix());
                }}
                slotProps={{
                  actionBar: { actions: ['clear', 'today', 'accept'] }
                }}
              />
            </LocalizationProvider>
          </FormControl>

          <FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
              <DateTimePicker
                label="结束时间"
                ampm={false}
                name="end_timestamp"
                value={filter.end_timestamp ? dayjs.unix(filter.end_timestamp) : null}
                onChange={(value) => {
                  if (value === null) {
                    handleFilterDateChange('end_timestamp', 0);
                    return;
                  }
                  handleFilterDateChange('end_timestamp', value.unix());
                }}
                slotProps={{
                  actionBar: { actions: ['clear', 'today', 'accept'] }
                }}
              />
            </LocalizationProvider>
          </FormControl>
        </Stack>
      </Box>
    </Card>
  );
}

ReportFilter.propTypes = {
  filter: PropTypes.object,
  handleFilterChange: PropTypes.func,
  handleFilterDateChange: PropTypes.func
};
