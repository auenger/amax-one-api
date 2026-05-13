import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Label,
  Pagination,
  Popup,
  Table,
} from 'semantic-ui-react';
import { API, showError, showSuccess, timestamp2string } from '../helpers';
import { ITEMS_PER_PAGE } from '../constants';

const TokenRequestsTable = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);

  const loadRequests = async (startIdx) => {
    const res = await API.get(`/api/token_request/?p=${startIdx}`);
    const { success, message, data } = res.data;
    if (success) {
      if (startIdx === 0) {
        setRequests(data || []);
      } else {
        let newRequests = [...requests];
        newRequests.splice(
          startIdx * ITEMS_PER_PAGE,
          data.length,
          ...(data || [])
        );
        setRequests(newRequests);
      }
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const onPaginationChange = (e, { activePage }) => {
    (async () => {
      if (activePage === Math.ceil(requests.length / ITEMS_PER_PAGE) + 1) {
        await loadRequests(activePage - 1);
      }
      setActivePage(activePage);
    })();
  };

  const refresh = async () => {
    setLoading(true);
    await loadRequests(activePage - 1);
  };

  useEffect(() => {
    loadRequests(0).catch((reason) => {
      showError(reason);
    });
  }, []);

  const handleApprove = async (id, idx) => {
    const res = await API.post(`/api/token_request/${id}/approve`);
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('token_request.messages.approve_success'));
      let newRequests = [...requests];
      let realIdx = (activePage - 1) * ITEMS_PER_PAGE + idx;
      newRequests[realIdx].status = 1;
      setRequests(newRequests);
    } else {
      showError(message);
    }
  };

  const handleReject = async (id, idx) => {
    const res = await API.post(`/api/token_request/${id}/reject`);
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('token_request.messages.reject_success'));
      let newRequests = [...requests];
      let realIdx = (activePage - 1) * ITEMS_PER_PAGE + idx;
      newRequests[realIdx].status = 2;
      setRequests(newRequests);
    } else {
      showError(message);
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case 0:
        return (
          <Label basic color='yellow'>
            {t('token_request.status.pending')}
          </Label>
        );
      case 1:
        return (
          <Label basic color='green'>
            {t('token_request.status.approved')}
          </Label>
        );
      case 2:
        return (
          <Label basic color='red'>
            {t('token_request.status.rejected')}
          </Label>
        );
      default:
        return (
          <Label basic color='grey'>
            {t('token_request.status.unknown')}
          </Label>
        );
    }
  };

  return (
    <Table basic={'very'} compact size='small'>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>{t('token_request.table.id')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.username')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.name')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.reason')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.models')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.quota')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.status')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.created_time')}</Table.HeaderCell>
          <Table.HeaderCell>{t('token_request.table.actions')}</Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {requests
          .slice(
            (activePage - 1) * ITEMS_PER_PAGE,
            activePage * ITEMS_PER_PAGE
          )
          .map((request, idx) => (
            <Table.Row key={request.id}>
              <Table.Cell>{request.id}</Table.Cell>
              <Table.Cell>{request.username}</Table.Cell>
              <Table.Cell>{request.name || t('token_request.table.no_name')}</Table.Cell>
              <Table.Cell>{request.reason || '-'}</Table.Cell>
              <Table.Cell>
                {request.models
                  ? request.models.split(',').slice(0, 3).join(', ') +
                    (request.models.split(',').length > 3 ? '...' : '')
                  : t('token_request.table.all_models')}
              </Table.Cell>
              <Table.Cell>
                {request.quota > 0
                  ? '$' + (request.quota / 500000).toFixed(2)
                  : t('token_request.table.unlimited')}
              </Table.Cell>
              <Table.Cell>{renderStatus(request.status)}</Table.Cell>
              <Table.Cell>{timestamp2string(request.created_at)}</Table.Cell>
              <Table.Cell>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {request.status === 0 && (
                    <>
                      <Popup
                        trigger={
                          <Button size='tiny' positive>
                            {t('token_request.buttons.approve')}
                          </Button>
                        }
                        on='click'
                        flowing
                        hoverable
                      >
                        <Button
                          size='tiny'
                          positive
                          onClick={() => handleApprove(request.id, idx)}
                        >
                          {t('token_request.buttons.confirm_approve')}
                        </Button>
                      </Popup>
                      <Popup
                        trigger={
                          <Button size='tiny' negative>
                            {t('token_request.buttons.reject')}
                          </Button>
                        }
                        on='click'
                        flowing
                        hoverable
                      >
                        <Button
                          size='tiny'
                          negative
                          onClick={() => handleReject(request.id, idx)}
                        >
                          {t('token_request.buttons.confirm_reject')}
                        </Button>
                      </Popup>
                    </>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
      </Table.Body>

      <Table.Footer>
        <Table.Row>
          <Table.HeaderCell colSpan='9'>
            <Button size='tiny' onClick={refresh} loading={loading}>
              {t('token_request.buttons.refresh')}
            </Button>
            <Pagination
              floated='right'
              activePage={activePage}
              onPageChange={onPaginationChange}
              size='tiny'
              siblingRange={1}
              totalPages={
                Math.ceil(requests.length / ITEMS_PER_PAGE) +
                (requests.length % ITEMS_PER_PAGE === 0 ? 1 : 0)
              }
            />
          </Table.HeaderCell>
        </Table.Row>
      </Table.Footer>
    </Table>
  );
};

export default TokenRequestsTable;
