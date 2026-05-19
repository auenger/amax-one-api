import { useEffect, useState } from 'react';
import { Grid, Typography, Stack, FormControl } from '@mui/material';
import { gridSpacing } from 'store/constant';
import StatisticalLineChartCard from './component/StatisticalLineChartCard';
import StatisticalBarChart from './component/StatisticalBarChart';
import { generateChartOptions, getLastSevenDays, get24Hours, getDaysInRange } from 'utils/chart';
import { API } from 'utils/api';
import { showError, calculateQuota, renderNumber } from 'utils/common';
import UserCard from 'ui-component/cards/UserCard';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

const Dashboard = () => {
  const [isLoading, setLoading] = useState(true);
  const [statisticalData, setStatisticalData] = useState([]);
  const [requestChart, setRequestChart] = useState(null);
  const [quotaChart, setQuotaChart] = useState(null);
  const [tokenChart, setTokenChart] = useState(null);
  const [users, setUsers] = useState([]);

  // Date range for dashboard
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const userDashboard = async (start, end) => {
    setLoading(true);
    try {
      const params = {};
      if (start && end) {
        params.start_timestamp = start;
        params.end_timestamp = end;
        // Determine granularity: same day = hour, multi-day = day
        const startDateObj = new Date(start * 1000);
        const endDateObj = new Date(end * 1000);
        if (
          startDateObj.getFullYear() === endDateObj.getFullYear() &&
          startDateObj.getMonth() === endDateObj.getMonth() &&
          startDateObj.getDate() === endDateObj.getDate()
        ) {
          params.granularity = 'hour';
        }
      }

      const res = await API.get('/api/user/dashboard', { params });
      const { success, message, data } = res.data;
      if (success) {
        if (data) {
          const isHour = params.granularity === 'hour';
          // Build time labels based on selected range or default 7 days
          let timeLabels;
          if (isHour) {
            timeLabels = get24Hours();
          } else if (start && end) {
            const startDateObj = new Date(start * 1000);
            const endDateObj = new Date(end * 1000);
            timeLabels = getDaysInRange(startDateObj.toISOString().slice(0, 10), endDateObj.toISOString().slice(0, 10));
          } else {
            timeLabels = getLastSevenDays();
          }
          let lineData = getLineDataGroup(data, timeLabels);
          setRequestChart(getLineCardOption(lineData, 'RequestCount'));
          setQuotaChart(getLineCardOption(lineData, 'Quota'));
          setTokenChart(getLineCardOption(lineData, 'PromptTokens'));
          setStatisticalData(getBarDataGroup(data, timeLabels));
        }
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error);
    }
    setLoading(false);
  };

  const loadUser = async () => {
    let res = await API.get(`/api/user/self`);
    const { success, message, data } = res.data;
    if (success) {
      setUsers(data);
    } else {
      showError(message);
    }
  };

  useEffect(() => {
    userDashboard(null, null);
    loadUser();
  }, []);

  const handleStartDateChange = (value) => {
    setStartDate(value);
    if (value && endDate) {
      const start = value.startOf('day').unix();
      const end = endDate.endOf('day').unix();
      userDashboard(start, end);
    } else if (value && !endDate) {
      // If only start is set, use the same day as end
      const start = value.startOf('day').unix();
      const end = value.endOf('day').unix();
      userDashboard(start, end);
    }
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
    if (startDate && value) {
      const start = startDate.startOf('day').unix();
      const end = value.endOf('day').unix();
      userDashboard(start, end);
    } else if (!startDate && value) {
      // If only end is set, use the same day as start
      const start = value.startOf('day').unix();
      const end = value.endOf('day').unix();
      userDashboard(start, end);
    }
  };

  const handleResetDateRange = () => {
    setStartDate(null);
    setEndDate(null);
    userDashboard(null, null);
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} alignItems="center" mb={1}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
            <FormControl sx={{ minWidth: 160 }}>
              <DatePicker
                label="开始日期"
                value={startDate}
                onChange={handleStartDateChange}
                slotProps={{
                  textField: { size: 'small' },
                  actionBar: { actions: ['clear', 'today', 'accept'] }
                }}
              />
            </FormControl>
            <Typography variant="body1" sx={{ px: 1 }}>
              ~
            </Typography>
            <FormControl sx={{ minWidth: 160 }}>
              <DatePicker
                label="结束日期"
                value={endDate}
                onChange={handleEndDateChange}
                slotProps={{
                  textField: { size: 'small' },
                  actionBar: { actions: ['clear', 'today', 'accept'] }
                }}
              />
            </FormControl>
          </LocalizationProvider>
          <Typography
            variant="body2"
            sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
            onClick={handleResetDateRange}
          >
            重置为默认7天
          </Typography>
        </Stack>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item lg={4} xs={12}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title="今日请求量"
              chartData={requestChart?.chartData}
              todayValue={requestChart?.todayValue}
            />
          </Grid>
          <Grid item lg={4} xs={12}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title="今日消费"
              chartData={quotaChart?.chartData}
              todayValue={quotaChart?.todayValue}
            />
          </Grid>
          <Grid item lg={4} xs={12}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title="今日 token"
              chartData={tokenChart?.chartData}
              todayValue={tokenChart?.todayValue}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item lg={8} xs={12}>
            <StatisticalBarChart isLoading={isLoading} chartDatas={statisticalData} />
          </Grid>
          <Grid item lg={4} xs={12}>
            <UserCard>
              <Grid container spacing={gridSpacing} justifyContent="center" alignItems="center" paddingTop={'20px'}>
                <Grid item xs={4}>
                  <Typography variant="h4">余额：</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="h3"> {users?.quota ? '$' + calculateQuota(users.quota) : '未知'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4">已使用：</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="h3"> {users?.used_quota ? '$' + calculateQuota(users.used_quota) : '未知'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4">调用次数：</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="h3"> {users?.request_count || '未知'}</Typography>
                </Grid>
              </Grid>
            </UserCard>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};
export default Dashboard;

function getLineDataGroup(statisticalData, timeLabels) {
  let groupedData = statisticalData.reduce((acc, cur) => {
    if (!acc[cur.Day]) {
      acc[cur.Day] = {
        date: cur.Day,
        RequestCount: 0,
        Quota: 0,
        PromptTokens: 0,
        CompletionTokens: 0
      };
    }
    acc[cur.Day].RequestCount += cur.RequestCount;
    acc[cur.Day].Quota += cur.Quota;
    acc[cur.Day].PromptTokens += cur.PromptTokens;
    acc[cur.Day].CompletionTokens += cur.CompletionTokens;
    return acc;
  }, {});

  return timeLabels.map((label) => {
    if (!groupedData[label]) {
      return {
        date: label,
        RequestCount: 0,
        Quota: 0,
        PromptTokens: 0,
        CompletionTokens: 0
      };
    } else {
      return groupedData[label];
    }
  });
}

function getBarDataGroup(data, timeLabels) {
  const labelCount = timeLabels.length;
  const result = [];
  const map = new Map();

  for (const item of data) {
    if (!map.has(item.ModelName)) {
      const newData = { name: item.ModelName, data: new Array(labelCount).fill(0) };
      map.set(item.ModelName, newData);
      result.push(newData);
    }
    const index = timeLabels.indexOf(item.Day);
    if (index !== -1) {
      map.get(item.ModelName).data[index] = calculateQuota(item.Quota, 3);
    }
  }

  return { data: result, xaxis: timeLabels };
}

function getLineCardOption(lineDataGroup, field) {
  let todayValue = 0;
  let chartData = null;
  const lastItem = lineDataGroup.length - 1;
  let lineData = lineDataGroup.map((item, index) => {
    let tmp = {
      date: item.date,
      value: item[field]
    };
    switch (field) {
      case 'Quota':
        tmp.value = calculateQuota(item.Quota, 3);
        break;
      case 'PromptTokens':
        tmp.value += item.CompletionTokens;
        break;
    }

    if (index == lastItem) {
      todayValue = tmp.value;
    }
    return tmp;
  });

  switch (field) {
    case 'RequestCount':
      chartData = generateChartOptions(lineData, '次');
      todayValue = renderNumber(todayValue);
      break;
    case 'Quota':
      chartData = generateChartOptions(lineData, '美元');
      todayValue = '$' + renderNumber(todayValue);
      break;
    case 'PromptTokens':
      chartData = generateChartOptions(lineData, '');
      todayValue = renderNumber(todayValue);
      break;
  }

  return { chartData: chartData, todayValue: todayValue };
}
