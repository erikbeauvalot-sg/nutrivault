/**
 * Patient Portal Visits Page
 * Read-only visit history
 */

import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Table, Badge } from 'react-bootstrap';
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
    SCHEDULED: t('portal.visitStatus.scheduled', 'Planifiée'),
    COMPLETED: t('portal.visitStatus.completed', 'Terminée'),
    CANCELLED: t('portal.visitStatus.cancelled', 'Annulée'),
    NO_SHOW: t('portal.visitStatus.noShow', 'Absent(e)')
  };
  return map[status] || status;
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
      } catch (err) {
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
      <h2 className="mb-4">📋 {t('portal.nav.visits', 'Mes consultations')}</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {visits.length === 0 ? (
        <Alert variant="info">{t('portal.noVisits', 'Aucune consultation')}</Alert>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>{t('portal.date', 'Date')}</th>
                  <th>{t('portal.type', 'Type')}</th>
                  <th>{t('portal.dietitian', 'Diététicien(ne)')}</th>
                  <th>{t('portal.status', 'Statut')}</th>
                  <th>{t('portal.summary', 'Résumé')}</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id}>
                    <td>{new Date(v.visit_date).toLocaleDateString('fr-FR')}</td>
                    <td>{v.visit_type || '—'}</td>
                    <td>
                      {v.dietitian
                        ? `${v.dietitian.first_name} ${v.dietitian.last_name}`
                        : '—'}
                    </td>
                    <td>
                      <Badge bg={statusVariant(v.status)}>
                        {statusLabel(v.status, t)}
                      </Badge>
                    </td>
                    <td className="text-muted">{v.visit_summary || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default PatientPortalVisits;
