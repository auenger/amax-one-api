import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import {
  IconUser,
  IconKey,
  IconBrandGithubCopilot,
  IconSitemap,
} from '@tabler/icons-react';
import {
  InputAdornment,
  OutlinedInput,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
require('dayjs/locale/zh-cn');

export default function TableToolBar({
  filterName,
  handleFilterName,
  channelOptions,
}) {
  const theme = useTheme();
  const grey500 = theme.palette.grey[500];

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 3, sm: 2, md: 4 }}
        padding={'24px'}
        paddingBottom={'0px'}
      >
        <FormControl>
          <InputLabel htmlFor="timing-model_name-label">模型名称</InputLabel>
          <OutlinedInput
            id="model_name"
            name="model_name"
            sx={{ minWidth: '100%' }}
            label="模型名称"
            value={filterName.model_name}
            onChange={handleFilterName}
            placeholder="模型名称"
            startAdornment={
              <InputAdornment position="start">
                <IconBrandGithubCopilot stroke={1.5} size="20px" color={grey500} />
              </InputAdornment>
            }
          />
        </FormControl>

        <FormControl>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'zh-cn'}>
            <DateTimePicker
              label="起始时间"
              ampm={false}
              name="start_timestamp"
              value={
                filterName.start_timestamp === 0
                  ? null
                  : dayjs.unix(filterName.start_timestamp)
              }
              onChange={(value) => {
                if (value === null) {
                  handleFilterName({ target: { name: 'start_timestamp', value: 0 } });
                  return;
                }
                handleFilterName({ target: { name: 'start_timestamp', value: value.unix() } });
              }}
              slotProps={{ actionBar: { actions: ['clear', 'today', 'accept'] } }}
            />
          </LocalizationProvider>
        </FormControl>

        <FormControl>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'zh-cn'}>
            <DateTimePicker
              label="结束时间"
              name="end_timestamp"
              ampm={false}
              value={
                filterName.end_timestamp === 0
                  ? null
                  : dayjs.unix(filterName.end_timestamp)
              }
              onChange={(value) => {
                if (value === null) {
                  handleFilterName({ target: { name: 'end_timestamp', value: 0 } });
                  return;
                }
                handleFilterName({ target: { name: 'end_timestamp', value: value.unix() } });
              }}
              slotProps={{ actionBar: { actions: ['clear', 'today', 'accept'] } }}
            />
          </LocalizationProvider>
        </FormControl>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 3, sm: 2, md: 4 }}
        padding={'24px'}
      >
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel htmlFor="timing-channel-filter-label">渠道</InputLabel>
          <Select
            id="timing-channel-filter-label"
            label="渠道"
            value={filterName.channel}
            name="channel"
            onChange={handleFilterName}
            sx={{ minWidth: '100%' }}
            MenuProps={{ PaperProps: { style: { maxHeight: 200 } } }}
          >
            <MenuItem value="">全部渠道</MenuItem>
            {channelOptions &&
              channelOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl>
          <InputLabel htmlFor="timing-username-label">用户名称</InputLabel>
          <OutlinedInput
            id="username"
            name="username"
            sx={{ minWidth: '100%' }}
            label="用户名称"
            value={filterName.username}
            onChange={handleFilterName}
            placeholder="用户名称"
            startAdornment={
              <InputAdornment position="start">
                <IconUser stroke={1.5} size="20px" color={grey500} />
              </InputAdornment>
            }
          />
        </FormControl>

        <FormControl>
          <InputLabel htmlFor="timing-min-total-ms-label">最小耗时(ms)</InputLabel>
          <OutlinedInput
            id="min_total_ms"
            name="min_total_ms"
            sx={{ minWidth: '100%' }}
            label="最小耗时(ms)"
            value={filterName.min_total_ms}
            onChange={handleFilterName}
            placeholder="最小耗时"
            startAdornment={
              <InputAdornment position="start">
                <IconKey stroke={1.5} size="20px" color={grey500} />
              </InputAdornment>
            }
          />
        </FormControl>

        <FormControl>
          <InputLabel htmlFor="timing-token_name-label">令牌名称</InputLabel>
          <OutlinedInput
            id="token_name"
            name="token_name"
            sx={{ minWidth: '100%' }}
            label="令牌名称"
            value={filterName.token_name}
            onChange={handleFilterName}
            placeholder="令牌名称"
            startAdornment={
              <InputAdornment position="start">
                <IconKey stroke={1.5} size="20px" color={grey500} />
              </InputAdornment>
            }
          />
        </FormControl>
      </Stack>
    </>
  );
}

TableToolBar.propTypes = {
  filterName: PropTypes.object,
  handleFilterName: PropTypes.func,
  channelOptions: PropTypes.array,
};
