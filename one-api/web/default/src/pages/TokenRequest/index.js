import React from 'react';
import { Card } from 'semantic-ui-react';
import TokenRequestsTable from '../../components/TokenRequestsTable';
import { useTranslation } from 'react-i18next';

const TokenRequest = () => {
  const { t } = useTranslation();

  return (
    <div className='dashboard-container'>
      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header className='header'>
            {t('token_request.title')}
          </Card.Header>
          <TokenRequestsTable />
        </Card.Content>
      </Card>
    </div>
  );
};

export default TokenRequest;
