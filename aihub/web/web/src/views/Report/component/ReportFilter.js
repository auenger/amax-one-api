import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { IconUser } from '@tabler/icons-react';
import {
  Autocomplete,
  TextField,
  Stack,
  FormControl,
  ButtonGroup,
  Button,
  Card,
  Box,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
require('dayjs/locale/zh-cn');

export default function ReportFilter({
  filter,
  handleFilterChange,
  handleFilterDateChange,
  handleSearch,
  handleReset,
  usernameOptions,
  showUsernameFilter
}) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.04)',
        mb: 3
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 2, md: 3 }} alignItems="center">
          {showUsernameFilter && (
            <FormControl sx={{ minWidth: 180 }}>
              <Autocomplete
                id="report-username"
                options={usernameOptions || []}
                value={filter.username || null}
                onChange={(event, newValue) => {
                  handleFilterChange({ target: { name: 'username', value: newValue || '' } });
                }}
                inputValue={filter.username || ''}
                onInputChange={(event, newInputValue) => {
                  handleFilterChange({ target: { name: 'username', value: newInputValue } });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="用户名称"
                    placeholder="搜索用户名"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconUser stroke={1.5} size="20px" color={theme.palette.grey[500]} />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
                size="small"
                freeSolo
                selectOnFocus
                blurOnSelect
              />
            </FormControl>
          )}

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
                  actionBar: { actions: ['clear', 'today', 'accept'] },
                  textField: { size: 'small' }
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
                  actionBar: { actions: ['clear', 'today', 'accept'] },
                  textField: { size: 'small' }
                }}
              />
            </LocalizationProvider>
          </FormControl>

          <ButtonGroup variant="outlined" aria-label="report actions" sx={{ '& .MuiButton-root': { borderRadius: `${theme.customization.borderRadius}px` } }}>
            <Tooltip title="重置">
              <Button onClick={handleReset} sx={{ minWidth: '40px', px: 1.5 }}>
                <IconRefresh size={18} />
              </Button>
            </Tooltip>
            <Tooltip title="查询">
              <Button onClick={handleSearch} sx={{ minWidth: '40px', px: 1.5 }} color="primary" variant="contained">
                <IconSearch size={18} />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Stack>
      </Box>
    </Card>
  );
}

ReportFilter.propTypes = {
  filter: PropTypes.object,
  handleFilterChange: PropTypes.func,
  handleFilterDateChange: PropTypes.func,
  handleSearch: PropTypes.func,
  handleReset: PropTypes.func,
  usernameOptions: PropTypes.array,
  showUsernameFilter: PropTypes.bool
};
