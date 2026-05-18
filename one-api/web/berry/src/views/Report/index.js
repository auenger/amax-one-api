import { useState, useEffect, useCallback, useMemo } from 'react';
import { Grid, Typography, Stack } from '@mui/material';
import { gridSpacing } from 'store/constant';
import { API } from 'utils/api';
import { showError, isAdmin } from 'utils/common';
import ReportFilter from './component/ReportFilter';
import SummaryCards from './component/SummaryCards';
import TrendChart from './component/TrendChart';
import TokenUsageTable from './component/TokenUsageTable';

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
    token_name: '',
    ...getDefaultTimeRange()
  });

  const userIsAdmin = isAdmin();

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.username) params.username = filter.username;
      if (filter.token_name) params.token_name = filter.token_name;
      if (filter.start_timestamp) params.start_timestamp = filter.start_timestamp;
      if (filter.end_timestamp) params.end_timestamp = filter.end_timestamp;

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
  }, [filter]);

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
      token_name: '',
      ...getDefaultTimeRange()
    });
    setReportData(null);
  };

  // Extract username and token name options from report data
  const usernameOptions = useMemo(() => {
    if (!reportData) return [];
    // Use the dedicated usernames list from API, or fall back to extracting from by_date_user
    if (reportData.usernames && reportData.usernames.length > 0) {
      return reportData.usernames;
    }
    const set = new Set();
    (reportData.by_date_user || []).forEach((row) => {
      if (row.username) set.add(row.username);
    });
    return Array.from(set).sort();
  }, [reportData]);

  const tokenNameOptions = useMemo(() => {
    if (!reportData) return [];
    // Use the dedicated token_names list from API, or fall back to extracting from by_token
    if (reportData.token_names && reportData.token_names.length > 0) {
      return reportData.token_names;
    }
    return (reportData.by_token || []).map((row) => row.token_name).filter(Boolean).sort();
  }, [reportData]);

  useEffect(() => {
    if (userIsAdmin) {
      loadReport();
    }
  }, []);

  if (!userIsAdmin) {
    return (
      <Stack direction="row" alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
        <Typography variant="h3" color="textSecondary">
          无权访问此页面
        </Typography>
      </Stack>
    );
  }

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
        tokenNameOptions={tokenNameOptions}
      />
      <Grid container spacing={gridSpacing} mt={0}>
        <Grid item xs={12}>
          <SummaryCards isLoading={isLoading} summary={reportData?.summary} />
        </Grid>
        <Grid item xs={12}>
          <TrendChart
            isLoading={isLoading}
            data={reportData?.by_date || []}
            dataByUser={reportData?.by_date_user || []}
          />
        </Grid>
        <Grid item xs={12}>
          <TokenUsageTable isLoading={isLoading} data={reportData?.by_token || []} />
        </Grid>
      </Grid>
    </>
  );
};

export default Report;
