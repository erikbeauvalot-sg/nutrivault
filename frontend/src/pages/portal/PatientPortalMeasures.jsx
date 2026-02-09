/**
 * Patient Portal Measures Page
 * Displays patient's measures with filtering and charts
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Row, Col, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as portalService from '../../services/portalService';

const PatientPortalMeasures = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [measures, setMeasures] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [selectedDef, setSelectedDef] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const fetchMeasures = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedDef) params.measure_definition_id = selectedDef;

      const data = await portalService.getMeasures(params);
      setMeasures(data?.measures || []);
      setDefinitions(data?.definitions || []);
    } catch (err) {
      setError(t('portal.loadError', 'Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeasures();
  }, [selectedDef, startDate, endDate]);

  const groupedMeasures = useMemo(() => {
    const groups = {};
    for (const m of measures) {
      const defName = m.measureDefinition?.display_name || m.measureDefinition?.name || t('common.unknown', 'Inconnu');
      if (!groups[defName]) {
        groups[defName] = { definition: m.measureDefinition, values: [] };
      }
      groups[defName].values.push(m);
    }
    return groups;
  }, [measures]);

  return (
    <div>
      <h2 className="mb-4">📊 {t('portal.nav.measures', 'Mes mesures')}</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('portal.measureType', 'Type de mesure')}</Form.Label>
                <Form.Select value={selectedDef} onChange={e => setSelectedDef(e.target.value)}>
                  <option value="">{t('common.all', 'Toutes')}</option>
                  {definitions.map(d => (
                    <option key={d.id} value={d.id}>{d.display_name || d.name} ({d.unit})</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('portal.dateFrom', 'Du')}</Form.Label>
                <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('portal.dateTo', 'Au')}</Form.Label>
                <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : measures.length === 0 ? (
        <Alert variant="info">{t('portal.noMeasures', 'Aucune mesure enregistrée')}</Alert>
      ) : (
        Object.entries(groupedMeasures).map(([name, group]) => (
          <Card key={name} className="mb-3">
            <Card.Header>
              <strong>{name}</strong>
              {group.definition?.unit && <Badge bg="secondary" className="ms-2">{group.definition.unit}</Badge>}
              <Badge bg="info" className="ms-2">{group.values.length} {t('portal.measurements', 'mesures')}</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>{t('portal.date', 'Date')}</th>
                    <th>{t('portal.value', 'Valeur')}</th>
                    <th>{t('portal.notes', 'Notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.values.map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.measured_at).toLocaleDateString('fr-FR')}</td>
                      <td className="fw-bold">{m.numeric_value ?? m.text_value ?? (m.boolean_value != null ? String(m.boolean_value) : '—')} {group.definition?.unit || ''}</td>
                      <td className="text-muted">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );
};

export default PatientPortalMeasures;
