import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { IconUser, IconKey } from '@tabler/icons-react';
import {
  Autocomplete,
  TextField,
  Stack,
  FormControl,
  ButtonGroup,
  Button,
  Card,
  Box,
  InputAdornment
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
  tokenNameOptions
}) {
  const theme = useTheme();

  return (
    <Card>
      <Box sx={{ padding: '24px 24px 0 24px' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 2, md: 4 }} alignItems="center">
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

          <FormControl sx={{ minWidth: 240 }}>
            <Autocomplete
              multiple
              freeSolo
              id="report-token-name"
              options={tokenNameOptions || []}
              value={filter.token_name ? filter.token_name.split(',').filter(Boolean) : []}
              onChange={(event, newValue) => {
                handleFilterChange({ target: { name: 'token_name', value: newValue.join(',') } });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="令牌名称"
                  placeholder="搜索令牌"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconKey stroke={1.5} size="20px" color={theme.palette.grey[500]} />
                      </InputAdornment>
                    )
                  }}
                />
              )}
              size="small"
              limitTags={3}
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

          <ButtonGroup variant="outlined" aria-label="report actions">
            <Button onClick={handleReset} startIcon={<IconRefresh width={'18px'} />}>
              重置
            </Button>
            <Button onClick={handleSearch} startIcon={<IconSearch width={'18px'} />}>
              查询
            </Button>
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
  tokenNameOptions: PropTypes.array
};
