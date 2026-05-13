import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Form,
  Label,
  Modal,
  Pagination,
  Table,
} from 'semantic-ui-react';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';
import { ITEMS_PER_PAGE } from '../../constants';

const MyRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    reason: '',
    models: '',
    quota: 0,
  });

  const loadRequests = async (startIdx) => {
    const res = await API.get(`/api/token_request/my?p=${startIdx}`);
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

  const handleSubmit = async () => {
    if (!formData.name) {
      showError(t('token_request.my_request.name_required'));
      return;
    }
    setSubmitting(true);
    const res = await API.post('/api/token_request/', {
      name: formData.name,
      reason: formData.reason,
      models: formData.models,
      quota: parseInt(formData.quota) || 0,
    });
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('token_request.my_request.submit_success'));
      setShowModal(false);
      setFormData({ name: '', reason: '', models: '', quota: 0 });
      refresh();
    } else {
      showError(message);
    }
    setSubmitting(false);
  };

  const handleFormChange = (e, { name, value }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    <div className='dashboard-container'>
      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header className='header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('token_request.my_request.title')}</span>
            <Button
              size='tiny'
              positive
              onClick={() => setShowModal(true)}
            >
              {t('token_request.my_request.new_request')}
            </Button>
          </Card.Header>

          <Table basic={'very'} compact size='small'>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t('token_request.table.id')}</Table.HeaderCell>
                <Table.HeaderCell>{t('token_request.table.name')}</Table.HeaderCell>
                <Table.HeaderCell>{t('token_request.table.reason')}</Table.HeaderCell>
                <Table.HeaderCell>{t('token_request.table.status')}</Table.HeaderCell>
                <Table.HeaderCell>{t('token_request.table.created_time')}</Table.HeaderCell>
                <Table.HeaderCell>{t('token_request.table.remark')}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {requests
                .slice(
                  (activePage - 1) * ITEMS_PER_PAGE,
                  activePage * ITEMS_PER_PAGE
                )
                .map((request) => (
                  <Table.Row key={request.id}>
                    <Table.Cell>{request.id}</Table.Cell>
                    <Table.Cell>{request.name || t('token_request.table.no_name')}</Table.Cell>
                    <Table.Cell>{request.reason || '-'}</Table.Cell>
                    <Table.Cell>{renderStatus(request.status)}</Table.Cell>
                    <Table.Cell>{timestamp2string(request.created_at)}</Table.Cell>
                    <Table.Cell>{request.remark || '-'}</Table.Cell>
                  </Table.Row>
                ))}
            </Table.Body>

            <Table.Footer>
              <Table.Row>
                <Table.HeaderCell colSpan='6'>
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
        </Card.Content>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size='tiny'
      >
        <Modal.Header>{t('token_request.my_request.new_request')}</Modal.Header>
        <Modal.Content>
          <Form loading={submitting}>
            <Form.Field>
              <Form.Input
                label={t('token_request.my_request.name')}
                name='name'
                required
                placeholder={t('token_request.my_request.name_placeholder')}
                value={formData.name}
                onChange={handleFormChange}
              />
            </Form.Field>
            <Form.Field>
              <Form.TextArea
                label={t('token_request.my_request.reason')}
                name='reason'
                placeholder={t('token_request.my_request.reason_placeholder')}
                value={formData.reason}
                onChange={handleFormChange}
              />
            </Form.Field>
            <Form.Field>
              <Form.Input
                label={t('token_request.my_request.models')}
                name='models'
                placeholder={t('token_request.my_request.models_placeholder')}
                value={formData.models}
                onChange={handleFormChange}
              />
            </Form.Field>
            <Form.Field>
              <Form.Input
                label={t('token_request.my_request.quota')}
                name='quota'
                type='number'
                placeholder={t('token_request.my_request.quota_placeholder')}
                value={formData.quota}
                onChange={handleFormChange}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setShowModal(false)}>
            {t('token_request.my_request.cancel')}
          </Button>
          <Button positive onClick={handleSubmit} loading={submitting}>
            {t('token_request.my_request.submit')}
          </Button>
        </Modal.Actions>
      </Modal>
    </div>
  );
};

export default MyRequests;
