import { useState, useEffect } from 'react';
import { showError } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import { Button, Card, Stack, Container, Typography, Box, Collapse, IconButton } from '@mui/material';
import TimingLogTableRow from './component/TableRow';
import TimingLogTableHead from './component/TableHead';
import TableToolBar from './component/TableToolBar';
import { API } from 'utils/api';
import { ITEMS_PER_PAGE } from 'constants';
import { IconRefresh, IconSearch, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

export default function TimingLog() {
  const originalKeyword = {
    p: 0,
    start_timestamp: 0,
    end_timestamp: new Date().getTime() / 1000 + 3600,
    channel: '',
    model_name: '',
    min_total_ms: '',
    username: '',
    token_name: ''
  };
  const [timings, setTimings] = useState([]);
  const [channelMap, setChannelMap] = useState({});
  const [channelOptions, setChannelOptions] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState(originalKeyword);
  const [initPage, setInitPage] = useState(true);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(-1);

  const loadChannels = async () => {
    let allChannels = {};
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await API.get(`/api/channel/?p=${page}`);
      const { success, data } = res.data;
      if (success && data) {
        data.forEach((ch) => { allChannels[ch.id] = ch.name; });
        hasMore = data.length >= 100;
        page++;
      } else {
        hasMore = false;
      }
    }
    setChannelMap(allChannels);
    setChannelOptions(
      Object.entries(allChannels)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.id - b.id)
    );
  };

  const loadTimings = async (startIdx) => {
    setSearching(true);
    const query = { ...searchKeyword };
    query.p = startIdx;

    const res = await API.get('/api/timing/', { params: query });
    const { success, message, data, total: totalCount } = res.data;
    if (success) {
      if (startIdx === 0) {
        setTimings(data || []);
      } else {
        let newTimings = [...timings];
        newTimings.splice(startIdx * ITEMS_PER_PAGE, (data || []).length, ...(data || []));
        setTimings(newTimings);
      }
      setTotal(totalCount || 0);
    } else {
      showError(message);
    }
    setSearching(false);
  };

  const onPaginationChange = (event, activePage) => {
    (async () => {
      if (activePage === Math.ceil(timings.length / ITEMS_PER_PAGE)) {
        await loadTimings(activePage);
      }
      setActivePage(activePage);
    })();
  };

  const searchTimings = async (event) => {
    event.preventDefault();
    await loadTimings(0);
    setActivePage(0);
  };

  const handleSearchKeyword = (event) => {
    setSearchKeyword({ ...searchKeyword, [event.target.name]: event.target.value });
  };

  const handleRefresh = () => {
    setInitPage(true);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? -1 : id);
  };

  useEffect(() => {
    setSearchKeyword(originalKeyword);
    setActivePage(0);
    setExpandedId(-1);
    loadChannels();
    loadTimings(0)
      .then()
      .catch((reason) => {
        showError(reason);
      });
    setInitPage(false);
  }, [initPage]);

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Typography variant="h4">计时日志</Typography>
      </Stack>
      <Card>
        <Box component="form" onSubmit={searchTimings} noValidate sx={{ marginTop: 2 }}>
          <TableToolBar filterName={searchKeyword} handleFilterName={handleSearchKeyword} channelOptions={channelOptions} />
        </Box>
        <Toolbar
          sx={{
            textAlign: 'right',
            height: 50,
            display: 'flex',
            justifyContent: 'space-between',
            p: (theme) => theme.spacing(0, 1, 0, 3)
          }}
        >
          <Container>
            <ButtonGroup variant="outlined" aria-label="outlined small primary button group" sx={{ marginBottom: 2 }}>
              <Button onClick={handleRefresh} startIcon={<IconRefresh width={'18px'} />}>
                刷新/清除搜索条件
              </Button>
              <Button onClick={searchTimings} startIcon={<IconSearch width={'18px'} />}>
                搜索
              </Button>
            </ButtonGroup>
          </Container>
        </Toolbar>
        {searching && <LinearProgress />}
        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 900 }}>
              <TimingLogTableHead />
              <TableBody>
                {timings.slice(activePage * ITEMS_PER_PAGE, (activePage + 1) * ITEMS_PER_PAGE).map((row, index) => (
                  <TimingLogTableRow
                    item={row}
                    key={`${row.id}_${index}`}
                    channelMap={channelMap}
                    expanded={expandedId === row.id}
                    onToggle={() => toggleExpand(row.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </PerfectScrollbar>
        <TablePagination
          page={activePage}
          component="div"
          count={total}
          rowsPerPage={ITEMS_PER_PAGE}
          onPageChange={onPaginationChange}
          rowsPerPageOptions={[ITEMS_PER_PAGE]}
        />
      </Card>
    </>
  );
}
