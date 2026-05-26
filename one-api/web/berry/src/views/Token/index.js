import { useState, useEffect, useMemo } from 'react';
import { showError, showSuccess, copy } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import { Button, Card, Box, Stack, Container, Typography, TextField } from '@mui/material';
import TokensTableRow from './component/TableRow';
import TokenTableHead from './component/TableHead';
import TableToolBar from 'ui-component/TableToolBar';
import { API } from 'utils/api';
import { ITEMS_PER_PAGE } from 'constants';
import { IconRefresh, IconPlus, IconCopy, IconFileSettings } from '@tabler/icons-react';
import EditeModal from './component/EditModal';


export default function Token() {
  const [tokens, setTokens] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [editTokenId, setEditTokenId] = useState(0);
  const [selectedToken, setSelectedToken] = useState(null);

  const serverOrigin = window.location.origin;

  const settingsJson = useMemo(() => {
    if (!selectedToken) return null;
    const json = {
      env: {
        ANTHROPIC_BASE_URL: `${serverOrigin}`,
        ANTHROPIC_AUTH_TOKEN: `sk-${selectedToken.key}`,
        ANTHROPIC_MODEL: "glm-5.1",
        ANTHROPIC_DEFAULT_HAIKU_MODEL: "glm-4.7",
        ANTHROPIC_DEFAULT_SONNET_MODEL: "glm-5.1",
        ANTHROPIC_DEFAULT_OPUS_MODEL: "glm-5.1",
        ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME: "glm-4.7",
        ANTHROPIC_DEFAULT_SONNET_MODEL_NAME: "glm-5.1",
        ANTHROPIC_DEFAULT_OPUS_MODEL_NAME: "glm-5.1",
        API_TIMEOUT_MS: "3000000"
      }
    };
    return JSON.stringify(json, null, 2);
  }, [selectedToken, serverOrigin]);

  const loadTokens = async (startIdx) => {
    setSearching(true);
    const res = await API.get(`/api/token/?p=${startIdx}`);
    const { success, message, data } = res.data;
    if (success) {
      if (startIdx === 0) {
        setTokens(data);
      } else {
        let newTokens = [...tokens];
        newTokens.splice(startIdx * ITEMS_PER_PAGE, data.length, ...data);
        setTokens(newTokens);
      }
    } else {
      showError(message);
    }
    setSearching(false);
  };

  useEffect(() => {
    loadTokens(0)
      .then()
      .catch((reason) => {
        showError(reason);
      });
  }, []);

  const onPaginationChange = (event, activePage) => {
    (async () => {
      if (activePage === Math.ceil(tokens.length / ITEMS_PER_PAGE)) {
        // In this case we have to load more data and then append them.
        await loadTokens(activePage);
      }
      setActivePage(activePage);
    })();
  };

  const searchTokens = async (event) => {
    event.preventDefault();
    if (searchKeyword === '') {
      await loadTokens(0);
      setActivePage(0);
      return;
    }
    setSearching(true);
    const res = await API.get(`/api/token/search?keyword=${searchKeyword}`);
    const { success, message, data } = res.data;
    if (success) {
      setTokens(data);
      setActivePage(0);
    } else {
      showError(message);
    }
    setSearching(false);
  };

  const handleSearchKeyword = (event) => {
    setSearchKeyword(event.target.value);
  };

  const manageToken = async (id, action, value) => {
    const url = '/api/token/';
    let data = { id };
    let res;
    switch (action) {
      case 'delete':
        res = await API.delete(url + id);
        break;
      case 'status':
        res = await API.put(url + `?status_only=true`, {
          ...data,
          status: value
        });
        break;
    }
    const { success, message } = res.data;
    if (success) {
      showSuccess('操作成功完成！');
      if (action === 'delete') {
        await handleRefresh();
      }
    } else {
      showError(message);
    }

    return res.data;
  };

  // 处理刷新
  const handleRefresh = async () => {
    await loadTokens(activePage);
  };

  const handleOpenModal = (tokenId) => {
    setEditTokenId(tokenId);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditTokenId(0);
  };

  const handleOkModal = (status) => {
    if (status === true) {
      handleCloseModal();
      handleRefresh();
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Typography variant="h4">令牌</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            handleOpenModal(0);
          }}
          startIcon={<IconPlus />}
        >
          新建令牌
        </Button>
      </Stack>
      <Alert severity="info">
        OpenAI 协议：将 API 基础地址 https://api.openai.com 替换为 <b>{window.location.origin}</b>，使用 <b>/v1/chat/completions</b> 路径，复制下面的密钥即可使用。Anthropic 协议：将 API 基础地址 https://api.anthropic.com 替换为 <b>{window.location.origin}</b>，使用 <b>/v1/messages</b> 路径。尚未下载 CC Switch？请前往 <a href="https://ccswitch.io" target="_blank" rel="noopener noreferrer">ccswitch.io</a> 下载。
      </Alert>
      <Card>
        <Box component="form" onSubmit={searchTokens} noValidate sx={{marginTop: 2}}>
          <TableToolBar filterName={searchKeyword} handleFilterName={handleSearchKeyword} placeholder={'搜索令牌的名称...'} />
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
            <ButtonGroup variant="outlined" aria-label="outlined small primary button group" sx={{marginBottom: 2}}>
              <Button onClick={handleRefresh} startIcon={<IconRefresh width={'18px'} />}>
                刷新
              </Button>
            </ButtonGroup>
          </Container>
        </Toolbar>
        {searching && <LinearProgress />}
        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <TokenTableHead />
              <TableBody>
                {tokens.slice(activePage * ITEMS_PER_PAGE, (activePage + 1) * ITEMS_PER_PAGE).map((row) => (
                  <TokensTableRow
                    item={row}
                    manageToken={manageToken}
                    key={row.id}
                    handleOpenModal={handleOpenModal}
                    setModalTokenId={setEditTokenId}
                    selected={selectedToken?.id === row.id}
                    onSelect={() => setSelectedToken(row)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </PerfectScrollbar>
        <TablePagination
          page={activePage}
          component="div"
          count={tokens.length + (tokens.length % ITEMS_PER_PAGE === 0 ? 1 : 0)}
          rowsPerPage={ITEMS_PER_PAGE}
          onPageChange={onPaginationChange}
          rowsPerPageOptions={[ITEMS_PER_PAGE]}
        />
      </Card>
      {settingsJson && (
        <Card sx={{ mt: 3, p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconFileSettings size={20} />
              <Typography variant="h6">Claude Code settings.json 配置</Typography>
            </Stack>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconCopy size={16} />}
              onClick={() => { copy(settingsJson); }}
            >
              复制
            </Button>
          </Stack>
          <Alert severity="info" sx={{ mb: 2 }}>
            当 CC Switch 不可用时，可直接将以上内容复制到项目 <b>.claude/settings.json</b> 文件（如不存在则新建），即可配置 Claude Code 连接本平台。
          </Alert>
          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={20}
            value={settingsJson}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'action.hover'
              }
            }}
          />
        </Card>
      )}
      {!settingsJson && (
        <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
          点击令牌行可生成对应的 <b>settings.json</b> 配置模板，用于手动配置 Claude Code。
        </Alert>
      )}
      <EditeModal open={openModal} onCancel={handleCloseModal} onOk={handleOkModal} tokenId={editTokenId} />
    </>
  );
}
