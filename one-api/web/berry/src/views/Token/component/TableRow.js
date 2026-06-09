import PropTypes from 'prop-types';
import { useState } from 'react';
import { useSelector } from 'react-redux';

import {
  Popover,
  TableRow,
  MenuItem,
  TableCell,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Tooltip,
  Stack
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { renderQuota, timestamp2string, copy } from 'utils/common';

import { IconDotsVertical, IconEdit, IconTrash, IconSparkles, IconCopy } from '@tabler/icons-react';

function createMenu(menuItems) {
  return (
    <>
      {menuItems.map((menuItem, index) => (
        <MenuItem key={index} onClick={menuItem.onClick} sx={{ color: menuItem.color }}>
          {menuItem.icon}
          {menuItem.text}
        </MenuItem>
      ))}
    </>
  );
}

export default function TokensTableRow({ item, manageToken, handleOpenModal, setModalTokenId, selected, onSelect }) {
  const [open, setOpen] = useState(null);
  const [menuItems, setMenuItems] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);
  const siteInfo = useSelector((state) => state.siteInfo);

  const handleDeleteOpen = () => {
    handleCloseMenu();
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleOpenMenu = (event) => {
    setMenuItems(actionItems);
    setOpen(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setOpen(null);
  };

  const handleStatus = async () => {
    const switchVlue = statusSwitch === 1 ? 2 : 1;
    const { success } = await manageToken(item.id, 'status', switchVlue);
    if (success) {
      setStatusSwitch(switchVlue);
    }
  };

  const handleDelete = async () => {
    handleCloseMenu();
    await manageToken(item.id, 'delete', '');
  };

  const actionItems = createMenu([
    {
      text: '编辑',
      icon: <IconEdit style={{ marginRight: '16px' }} />,
      onClick: () => {
        handleCloseMenu();
        handleOpenModal();
        setModalTokenId(item.id);
      },
      color: undefined
    },
    {
      text: '删除',
      icon: <IconTrash style={{ marginRight: '16px' }} />,
      onClick: handleDeleteOpen,
      color: 'error.main'
    }
  ]);

  const handleCcSwitchImport = () => {
    const serverAddress = window.location.origin;
    const systemName = siteInfo?.system_name || 'ModelHub';
    const providerName = `${systemName} · ${item.name}`;
    const url = `ccswitch://v1/import?resource=provider&app=claude`
      + `&name=${encodeURIComponent(providerName)}`
      + `&apiKey=${encodeURIComponent('sk-' + item.key)}`
      + `&endpoint=${encodeURIComponent(serverAddress)}`
      + `&homepage=${encodeURIComponent(serverAddress)}`;
    window.open(url);
  };

  return (
    <>
      <TableRow tabIndex={item.id} hover selected={selected} onClick={onSelect} sx={{ cursor: 'pointer' }}>
        <TableCell>{item.name}</TableCell>

        <TableCell>
          <Tooltip
            title={(() => {
              switch (statusSwitch) {
                case 1:
                  return '已启用';
                case 2:
                  return '已禁用';
                case 3:
                  return '已过期';
                case 4:
                  return '已耗尽';
                default:
                  return '未知';
              }
            })()}
            placement="top"
          >
            <TableSwitch
              id={`switch-${item.id}`}
              checked={statusSwitch === 1}
              onChange={handleStatus}
              onClick={(e) => e.stopPropagation()}
              // disabled={statusSwitch !== 1 && statusSwitch !== 2}
            />
          </Tooltip>
        </TableCell>

        <TableCell>{renderQuota(item.used_quota)}</TableCell>

        <TableCell>{item.unlimited_quota ? '无限制' : renderQuota(item.remain_quota, 2)}</TableCell>

        <TableCell>{timestamp2string(item.created_time)}</TableCell>

        <TableCell>{item.expired_time === -1 ? '永不过期' : timestamp2string(item.expired_time)}</TableCell>

        <TableCell>
          <Stack direction="row" spacing={1}>
            <Tooltip title="复制令牌" placement="top">
              <IconButton onClick={(e) => { e.stopPropagation(); copy(`sk-${item.key}`); }} sx={{ color: 'rgb(99, 115, 129)' }}>
                <IconCopy size={'20px'} />
              </IconButton>
            </Tooltip>
            <Tooltip title="导入 cc-switch" placement="top">
              <IconButton onClick={(e) => { e.stopPropagation(); handleCcSwitchImport(); }} sx={{ color: 'rgb(99, 115, 129)' }}>
                <IconSparkles size={'20px'} />
              </IconButton>
            </Tooltip>
            <IconButton onClick={(e) => { e.stopPropagation(); handleOpenMenu(e); }} sx={{ color: 'rgb(99, 115, 129)' }}>
              <IconDotsVertical />
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>
      <Popover
        open={!!open}
        anchorEl={open}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 140 }
        }}
      >
        {menuItems}
      </Popover>

      <Dialog open={openDelete} onClose={handleDeleteClose}>
        <DialogTitle>删除Token</DialogTitle>
        <DialogContent>
          <DialogContentText>是否删除Token {item.name}？</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>关闭</Button>
          <Button onClick={handleDelete} sx={{ color: 'error.main' }} autoFocus>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

TokensTableRow.propTypes = {
  item: PropTypes.object,
  manageToken: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalTokenId: PropTypes.func,
  selected: PropTypes.bool,
  onSelect: PropTypes.func
};
