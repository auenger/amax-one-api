import { useState, useEffect, useCallback, useMemo } from 'react';
import { Grid, Typography, Stack } from '@mui/material';
import { gridSpacing } from 'store/constant';
import { API } from 'utils/api';
import { showError } from 'utils/common';
import ReportFilter from './component/ReportFilter';
import SummaryCards from './component/SummaryCards';
import DailyHourlyChart from './component/DailyHourlyChart';
import TrendChart from './component/TrendChart';
import UserUsageTable from './component/UserUsageTable';
import ChannelUsageTable from './component/ChannelUsageTable';

const Report = () => {
  const [isLoading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const getDefaultTimeRange = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return {
      start_timestamp: Math.floor(start.getTime() / 1000),
      end_timestamp: Math.floor(end.getTime() / 1000)
    };
  };

  const [filter, setFilter] = useState({
    username: '',
    ...getDefaultTimeRange()
  });

  const computeGranularity = useCallback(() => {
    if (!filter.start_timestamp || !filter.end_timestamp) return 'day';
    const startDate = new Date(filter.start_timestamp * 1000);
    const endDate = new Date(filter.end_timestamp * 1000);
    if (
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate()
    ) {
      return 'hour';
    }
    return 'day';
  }, [filter.start_timestamp, filter.end_timestamp]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.username) params.username = filter.username;
      if (filter.start_timestamp) params.start_timestamp = filter.start_timestamp;
      if (filter.end_timestamp) params.end_timestamp = filter.end_timestamp;
      params.granularity = computeGranularity();

      const res = await API.get('/api/user/report', { params });
      const { success, message, data } = res.data;
      if (success) {
        setReportData(data);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error);
    }
    setLoading(false);
  }, [filter, computeGranularity]);

  const handleSearch = () => {
    loadReport();
  };

  const handleFilterChange = (event) => {
    setFilter((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleFilterDateChange = (name, value) => {
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilter({
      username: '',
      ...getDefaultTimeRange()
    });
    setReportData(null);
  };

  const usernameOptions = useMemo(() => {
    if (!reportData) return [];
    if (reportData.usernames && reportData.usernames.length > 0) {
      return reportData.usernames;
    }
    const set = new Set();
    (reportData.by_date_user || []).forEach((row) => {
      if (row.username) set.add(row.username);
    });
    return Array.from(set).sort();
  }, [reportData]);

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Typography variant="h4">用量报表</Typography>
      </Stack>
      <ReportFilter
        filter={filter}
        handleFilterChange={handleFilterChange}
        handleFilterDateChange={handleFilterDateChange}
        handleSearch={handleSearch}
        handleReset={handleReset}
        usernameOptions={usernameOptions}
        showUsernameFilter={true}
      />
      <Grid container spacing={gridSpacing} mt={0}>
        <Grid item xs={12}>
          <SummaryCards isLoading={isLoading} summary={reportData?.summary} />
        </Grid>
        <Grid item xs={12}>
          <DailyHourlyChart />
        </Grid>
        <Grid item xs={12}>
          <TrendChart
            isLoading={isLoading}
            data={reportData?.by_date || []}
            dataByUser={reportData?.by_date_user || []}
            granularity={computeGranularity()}
          />
        </Grid>
        <Grid item xs={12}>
          <UserUsageTable isLoading={isLoading} data={reportData?.by_user || []} />
        </Grid>
        <Grid item xs={12}>
          <ChannelUsageTable isLoading={isLoading} data={reportData?.by_channel || []} />
        </Grid>
      </Grid>
    </>
  );
};

export default Report;
