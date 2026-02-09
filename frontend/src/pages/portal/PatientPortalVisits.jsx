/**
 * Patient Portal Visits Page
 * Read-only visit history with custom field details (bilan, objectifs, etc.)
 */

import { useState, useEffect } from 'react';
import { Spinner, Alert, Badge, Accordion } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as portalService from '../../services/portalService';

const statusVariant = (status) => {
  const map = {
    SCHEDULED: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    NO_SHOW: 'warning'
  };
  return map[status] || 'secondary';
};

const statusLabel = (status, t) => {
  const map = {
    SCHEDULED: t('portal.visitStatus.scheduled', 'Planifiee'),
    COMPLETED: t('portal.visitStatus.completed', 'Terminee'),
    CANCELLED: t('portal.visitStatus.cancelled', 'Annulee'),
    NO_SHOW: t('portal.visitStatus.noShow', 'Absent(e)')
  };
  return map[status] || status;
};

const getFieldValue = (cfv) => {
  if (!cfv || !cfv.field_definition) return null;
  const type = cfv.field_definition.field_type;
  if (type === 'number') return cfv.value_number != null ? String(cfv.value_number) : null;
  if (type === 'boolean') return cfv.value_boolean != null ? (cfv.value_boolean ? 'Oui' : 'Non') : null;
  if (type === 'select' && cfv.value_json) {
    try {
      const arr = typeof cfv.value_json === 'string' ? JSON.parse(cfv.value_json) : cfv.value_json;
      return Array.isArray(arr) ? arr.join(', ') : cfv.value_text;
    } catch { return cfv.value_text; }
  }
  return cfv.value_text || null;
};

const PatientPortalVisits = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getVisits();
        setVisits(data || []);
      } catch {
        setError(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <h2 className="mb-4">{'\uD83D\uDCCB'} {t('portal.nav.visits', 'Mes consultations')}</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {visits.length === 0 ? (
        <Alert variant="info">{t('portal.noVisits', 'Aucune consultation')}</Alert>
      ) : (
        <Accordion>
          {visits.map((v, index) => {
            const fields = (v.custom_field_values || [])
              .filter(cfv => cfv.field_definition && getFieldValue(cfv));

            return (
              <Accordion.Item key={v.id} eventKey={String(index)}>
                <Accordion.Header>
                  <div className="d-flex justify-content-between align-items-center w-100 me-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <strong>
                        {new Date(v.visit_date).toLocaleDateString('fr-FR', {
                          weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </strong>
                      {v.visit_type && <span className="text-muted">— {v.visit_type}</span>}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {v.dietitian && (
                        <small className="text-muted">{v.dietitian.first_name} {v.dietitian.last_name}</small>
                      )}
                      <Badge bg={statusVariant(v.status)}>
                        {statusLabel(v.status, t)}
                      </Badge>
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  {/* Visit summary */}
                  {v.visit_summary && (
                    <div className="mb-3">
                      <strong className="d-block mb-1">{t('portal.summary', 'Resume')}</strong>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{v.visit_summary}</p>
                    </div>
                  )}

                  {/* Custom fields */}
                  {fields.length > 0 ? (
                    fields.map(cfv => {
                      const val = getFieldValue(cfv);
                      return (
                        <div key={cfv.id} className="mb-3">
                          <strong className="d-block mb-1">{cfv.field_definition.field_label || cfv.field_definition.field_name}</strong>
                          <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{val}</p>
                        </div>
                      );
                    })
                  ) : !v.visit_summary ? (
                    <p className="text-muted mb-0">{t('portal.noVisitDetails', 'Aucun detail pour cette consultation')}</p>
                  ) : null}
                </Accordion.Body>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default PatientPortalVisits;
