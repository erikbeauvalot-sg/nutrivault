/**
 * Patient Portal Measures Page
 * Displays patient's measures with filtering and charts
 * Allows patients to self-log measures when enabled
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Form, Row, Col, Spinner, Alert, Table, Badge, Modal, Button } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import * as portalService from '../../services/portalService';
import PullToRefreshWrapper from '../../components/common/PullToRefreshWrapper';
import useRefreshOnFocus from '../../hooks/useRefreshOnFocus';

const CHART_COLORS = ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#6610f2', '#fd7e14', '#20c997', '#6c757d'];

const PatientPortalMeasures = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [allMeasures, setAllMeasures] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [loggableDefinitions, setLoggableDefinitions] = useState([]);
  const [selectedDef, setSelectedDef] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Add measure modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ measure_definition_id: '', value: '', measured_at: '', notes: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchMeasures = async (params = {}) => {
    const data = await portalService.getMeasures(params);
    const measures = data?.measures || [];
    const defs = data?.definitions || [];
    const loggable = data?.loggableDefinitions || [];
    setAllMeasures(measures);
    setDefinitions(defs);
    setLoggableDefinitions(loggable);
    return { measures, defs };
  };

  // On first load, fetch ALL measures to know available definitions
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const { defs } = await fetchMeasures({});

        // Set default selected definition from URL param or "weight"
        const urlDefId = searchParams.get('def');
        if (urlDefId && defs.find(d => d.id === urlDefId)) {
          setSelectedDef(urlDefId);
        } else {
          const weightDef = defs.find(d => d.name === 'weight');
          if (weightDef) setSelectedDef(weightDef.id);
          else if (defs.length > 0) setSelectedDef(defs[0].id);
        }
      } catch (err) {
        setError(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refreshMeasures = useCallback(() => fetchMeasures({}), []);
  useRefreshOnFocus(refreshMeasures);

  // Refetch when filters change (except on first load)
  useEffect(() => {
    if (!loading && (startDate || endDate)) {
      const fetchFiltered = async () => {
        try {
          setError('');
          const params = {};
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
          const data = await portalService.getMeasures(params);
          setAllMeasures(data?.measures || []);
        } catch (err) {
          setError(t('portal.loadError', 'Erreur lors du chargement'));
        }
      };
      fetchFiltered();
    }
  }, [startDate, endDate]);

  const handleDefChange = (defId) => {
    setSelectedDef(defId);
    if (defId) {
      setSearchParams({ def: defId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // Group measures by definition
  const groupedMeasures = useMemo(() => {
    const groups = {};
    for (const m of allMeasures) {
      const defId = m.measure_definition_id;
      if (!defId) continue;
      if (!groups[defId]) {
        groups[defId] = { definition: m.measureDefinition, values: [] };
      }
      groups[defId].values.push(m);
    }
    return groups;
  }, [allMeasures]);

  // Get the currently selected definition's measures for chart
  const selectedGroup = selectedDef ? groupedMeasures[selectedDef] : null;
  const selectedDefinition = selectedGroup?.definition || definitions.find(d => d.id === selectedDef);

  // Prepare chart data (sorted oldest to newest)
  const chartData = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.values
      .filter(m => m.numeric_value != null)
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))
      .map(m => ({
        date: new Date(m.measured_at).toLocaleDateString('fr-FR'),
        fullDate: new Date(m.measured_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
        value: parseFloat(m.numeric_value),
        notes: m.notes
      }));
  }, [selectedGroup]);

  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range === 0 ? Math.abs(min) * 0.1 || 1 : range * 0.15;
    return [
      Math.floor((min - padding) * 10) / 10,
      Math.ceil((max + padding) * 10) / 10
    ];
  }, [chartData]);

  // Calculate average for reference line
  const average = useMemo(() => {
    if (chartData.length < 2) return null;
    const sum = chartData.reduce((acc, d) => acc + d.value, 0);
    return Math.round((sum / chartData.length) * 10) / 10;
  }, [chartData]);

  // All measures for the selected definition (for the table), sorted newest first
  const tableMeasures = useMemo(() => {
    if (!selectedDef || !groupedMeasures[selectedDef]) {
      return allMeasures;
    }
    return groupedMeasures[selectedDef].values;
  }, [selectedDef, groupedMeasures, allMeasures]);

  // --- Add Measure Modal Logic ---

  const selectedAddDef = useMemo(() => {
    return loggableDefinitions.find(d => d.id === addForm.measure_definition_id);
  }, [addForm.measure_definition_id, loggableDefinitions]);

  const handleOpenAddModal = () => {
    setAddForm({
      measure_definition_id: loggableDefinitions.length === 1 ? loggableDefinitions[0].id : '',
      value: '',
      measured_at: new Date().toISOString().slice(0, 16),
      notes: ''
    });
    setAddError('');
    setAddSuccess('');
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      let submitValue = addForm.value;
      // Convert boolean string to actual boolean
      if (selectedAddDef?.measure_type === 'boolean') {
        submitValue = addForm.value === 'true';
      }

      await portalService.logMeasure({
        measure_definition_id: addForm.measure_definition_id,
        value: submitValue,
        measured_at: addForm.measured_at ? new Date(addForm.measured_at).toISOString() : undefined,
        notes: addForm.notes || undefined
      });

      setAddSuccess(t('portal.measureSaved', 'Mesure enregistrée'));

      // Refetch measures
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      await fetchMeasures(params);

      setTimeout(() => {
        setShowAddModal(false);
      }, 1000);
    } catch (err) {
      setAddError(err.response?.data?.error || err.message || t('portal.loadError', 'Erreur'));
    } finally {
      setAddLoading(false);
    }
  };

  const renderValueInput = () => {
    if (!selectedAddDef) return null;

    switch (selectedAddDef.measure_type) {
      case 'numeric':
        return (
          <Form.Control
            type="number"
            step="any"
            min={selectedAddDef.min_value ?? undefined}
            max={selectedAddDef.max_value ?? undefined}
            value={addForm.value}
            onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
            placeholder={selectedAddDef.unit ? `${t('portal.measureValue', 'Valeur')} (${selectedAddDef.unit})` : t('portal.measureValue', 'Valeur')}
            required
          />
        );
      case 'boolean':
        return (
          <Form.Select
            value={addForm.value}
            onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
            required
          >
            <option value="">{t('portal.selectMeasureType', 'Choisir...')}</option>
            <option value="true">{t('common.yes', 'Oui')}</option>
            <option value="false">{t('common.no', 'Non')}</option>
          </Form.Select>
        );
      case 'text':
      default:
        return (
          <Form.Control
            type="text"
            value={addForm.value}
            onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
            placeholder={t('portal.measureValue', 'Valeur')}
            required
          />
        );
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white border rounded p-2 shadow-sm" style={{ fontSize: '0.85em' }}>
          <p className="mb-1 fw-bold">{d.fullDate}</p>
          <p className="mb-0" style={{ color: CHART_COLORS[0] }}>
            {payload[0].value} {selectedDefinition?.unit || ''}
          </p>
          {d.notes && <p className="mb-0 text-muted mt-1" style={{ fontSize: '0.8em' }}>{d.notes}</p>}
        </div>
      );
    }
    return null;
  };

  const chartHeight = isMobile ? 200 : 280;

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  return (
    <PullToRefreshWrapper onRefresh={() => fetchMeasures({})}>
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
          {'\uD83D\uDCCA'} {t('portal.nav.measures', 'Mes mesures')}
        </h2>
        {loggableDefinitions.length > 0 && (
          <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
            + {t('portal.addMeasure', 'Ajouter une mesure')}
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {definitions.length === 0 && loggableDefinitions.length === 0 ? (
        <Alert variant="info">{t('portal.noMeasures', 'Aucune mesure enregistrée')}</Alert>
      ) : (
        <>
          {/* Measure type pills */}
          {definitions.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {definitions.map((d, i) => {
                const count = groupedMeasures[d.id]?.values?.length || 0;
                const isSelected = selectedDef === d.id;
                return (
                  <Badge
                    key={d.id}
                    bg={isSelected ? 'primary' : 'light'}
                    text={isSelected ? 'white' : 'dark'}
                    className="px-3 py-2"
                    style={{ cursor: 'pointer', fontSize: '0.85em', border: isSelected ? 'none' : '1px solid #dee2e6' }}
                    onClick={() => handleDefChange(d.id)}
                  >
                    {d.display_name || d.name} {count > 0 && <span className="ms-1 opacity-75">({count})</span>}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Chart */}
          {selectedDef && chartData.length >= 2 && (
            <Card className="mb-3">
              <Card.Header className="py-2 d-flex justify-content-between align-items-center">
                <span className="fw-bold" style={{ fontSize: '0.95em' }}>
                  {selectedDefinition?.display_name || selectedDefinition?.name}
                  {selectedDefinition?.unit && <span className="text-muted fw-normal ms-1">({selectedDefinition.unit})</span>}
                </span>
                <div className="d-flex align-items-center gap-3">
                  {average != null && (
                    <small className="text-muted">
                      {t('portal.average', 'Moyenne')} : <strong>{average}</strong> {selectedDefinition?.unit || ''}
                    </small>
                  )}
                  {chartData.length >= 2 && (
                    <small className={chartData[chartData.length - 1].value > chartData[chartData.length - 2].value ? 'text-danger' : chartData[chartData.length - 1].value < chartData[chartData.length - 2].value ? 'text-success' : 'text-muted'}>
                      {chartData[chartData.length - 1].value > chartData[chartData.length - 2].value ? '\u2191' : chartData[chartData.length - 1].value < chartData[chartData.length - 2].value ? '\u2193' : '='}{' '}
                      {Math.abs(chartData[chartData.length - 1].value - chartData[chartData.length - 2].value).toFixed(1)}
                    </small>
                  )}
                </div>
              </Card.Header>
              <Card.Body className={isMobile ? 'p-2' : 'p-3'}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={chartData} margin={isMobile ? { left: -15, right: 5, top: 5, bottom: 5 } : { left: 0, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                      height={isMobile ? 50 : 30}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      width={isMobile ? 40 : 55}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {average != null && (
                      <ReferenceLine
                        y={average}
                        stroke="#6c757d"
                        strokeDasharray="5 5"
                        strokeOpacity={0.5}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={isMobile ? 2 : 2.5}
                      dot={{ r: isMobile ? 3 : 4, fill: CHART_COLORS[0] }}
                      activeDot={{ r: isMobile ? 5 : 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          )}

          {selectedDef && chartData.length === 1 && (
            <Alert variant="light" className="mb-3">
              <strong>{chartData[0].value} {selectedDefinition?.unit || ''}</strong> — {chartData[0].fullDate}
              <br />
              <small className="text-muted">{t('portal.needMoreData', 'Le graphique apparaîtra avec plus de mesures')}</small>
            </Alert>
          )}

          {/* Date filters */}
          <Card className="mb-3">
            <Card.Body className="py-2 px-3">
              <Row className="g-2">
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label className="small mb-1">{t('portal.dateFrom', 'Du')}</Form.Label>
                    <Form.Control size="sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label className="small mb-1">{t('portal.dateTo', 'Au')}</Form.Label>
                    <Form.Control size="sm" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Data table */}
          {tableMeasures.length === 0 ? (
            <Alert variant="info">{t('portal.noMeasures', 'Aucune mesure enregistrée')}</Alert>
          ) : (
            <Card>
              <Card.Header className="py-2">
                <strong>{selectedDefinition?.display_name || selectedDefinition?.name || t('common.all', 'Toutes')}</strong>
                <Badge bg="info" className="ms-2">{tableMeasures.length} {t('portal.measurements', 'mesures')}</Badge>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th>{t('portal.date', 'Date')}</th>
                      <th>{t('portal.value', 'Valeur')}</th>
                      {!selectedDef && <th>{t('portal.measureType', 'Type')}</th>}
                      <th>{t('portal.notes', 'Notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableMeasures.map(m => (
                      <tr key={m.id}>
                        <td>{new Date(m.measured_at).toLocaleDateString('fr-FR')}</td>
                        <td className="fw-bold">
                          {m.numeric_value ?? m.text_value ?? (m.boolean_value != null ? String(m.boolean_value) : '—')}{' '}
                          {m.measureDefinition?.unit || ''}
                        </td>
                        {!selectedDef && (
                          <td>
                            <Badge
                              bg="light"
                              text="dark"
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleDefChange(m.measure_definition_id)}
                            >
                              {m.measureDefinition?.display_name || m.measureDefinition?.name || '—'}
                            </Badge>
                          </td>
                        )}
                        <td className="text-muted">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Add Measure Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            {t('portal.addMeasureTitle', 'Ajouter une mesure')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddSubmit}>
          <Modal.Body>
            {addError && <Alert variant="danger" className="py-2">{addError}</Alert>}
            {addSuccess && <Alert variant="success" className="py-2">{addSuccess}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>{t('portal.selectMeasureType', 'Type de mesure')}</Form.Label>
              <Form.Select
                value={addForm.measure_definition_id}
                onChange={e => setAddForm(f => ({ ...f, measure_definition_id: e.target.value, value: '' }))}
                required
              >
                <option value="">{t('portal.selectMeasureType', 'Choisir...')}</option>
                {loggableDefinitions.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.display_name || d.name} {d.unit ? `(${d.unit})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {selectedAddDef && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.measureValue', 'Valeur')}</Form.Label>
                  {renderValueInput()}
                  {selectedAddDef.measure_type === 'numeric' && selectedAddDef.min_value != null && selectedAddDef.max_value != null && (
                    <Form.Text className="text-muted">
                      {t('measures.range', 'Plage')} : {selectedAddDef.min_value} – {selectedAddDef.max_value} {selectedAddDef.unit || ''}
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.measureDate', 'Date')}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={addForm.measured_at}
                    onChange={e => setAddForm(f => ({ ...f, measured_at: e.target.value }))}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.measureNotes', 'Notes')} <small className="text-muted">({t('common.optional', 'optionnel')})</small></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    maxLength={500}
                    value={addForm.notes}
                    onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={t('portal.measureNotes', 'Notes')}
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={addLoading}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button variant="primary" type="submit" disabled={addLoading || !addForm.measure_definition_id || addForm.value === '' || !!addSuccess}>
              {addLoading ? <Spinner animation="border" size="sm" /> : t('common.save', 'Enregistrer')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
    </PullToRefreshWrapper>
  );
};

export default PatientPortalMeasures;
