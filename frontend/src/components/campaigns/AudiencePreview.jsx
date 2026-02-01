/**
 * Audience Preview Component
 * Shows a preview of the target audience for a campaign
 */

import { Card, ListGroup, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const AudiencePreview = ({ preview, loading }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          <i className="bi bi-people me-2"></i>
          {t('campaigns.audiencePreview', 'Audience Preview')}
        </h5>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" variant="primary" />
            <p className="mt-2 text-muted small">{t('campaigns.calculatingAudience', 'Calculating audience...')}</p>
          </div>
        ) : preview ? (
          <>
            {/* Count */}
            <div className="text-center mb-4">
              <div className="display-4 text-primary fw-bold">{preview.count}</div>
              <div className="text-muted">
                {t('campaigns.matchingPatients', 'matching patients')}
              </div>
            </div>

            {/* Sample */}
            {preview.sample && preview.sample.length > 0 && (
              <>
                <div className="small text-muted mb-2">
                  {t('campaigns.sampleRecipients', 'Sample recipients:')}
                </div>
                <ListGroup variant="flush">
                  {preview.sample.map((patient, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center px-0 py-2">
                      <div>
                        <div className="fw-medium">{patient.name}</div>
                        <small className="text-muted">{patient.email}</small>
                      </div>
                      <Badge bg="light" text="dark" className="text-uppercase">
                        {patient.language || 'fr'}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                {preview.count > preview.sample.length && (
                  <div className="text-center text-muted small mt-2">
                    {t('campaigns.andMorePatients', 'and {{count}} more...', { count: preview.count - preview.sample.length })}
                  </div>
                )}
              </>
            )}

            {/* Warning if no patients */}
            {preview.count === 0 && (
              <div className="alert alert-warning mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {t('campaigns.noMatchingPatients', 'No patients match these criteria. Adjust your conditions.')}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-funnel display-6 d-block mb-2"></i>
            <p className="small">{t('campaigns.addConditionsToPreview', 'Add conditions to see your target audience.')}</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AudiencePreview;
