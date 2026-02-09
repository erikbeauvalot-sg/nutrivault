/**
 * Patient Portal Dashboard
 * Welcome page with summary of recent measures, upcoming visits, and documents
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Spinner, Alert, Modal, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import * as portalService from '../../services/portalService';

/**
 * Build the summary measures list:
 * 1) Latest weight
 * 2) Calculated BMI (from latest weight + height)
 * 3) Other latest measures (one per definition, excluding weight/height)
 */
const buildSummaryMeasures = (allMeasures, t) => {
  // Group by definition, keep only the latest per definition
  const latestByDef = {};
  for (const m of allMeasures) {
    const defName = m.measureDefinition?.name;
    if (!defName) continue;
    if (!latestByDef[defName]) latestByDef[defName] = m;
  }

  const result = [];

  // 1) Weight
  const weightM = latestByDef['weight'];
  if (weightM) {
    result.push(weightM);
  }

  // 2) IMC (calculated from weight + height)
  const heightM = latestByDef['height'];
  if (weightM && heightM) {
    const w = parseFloat(weightM.numeric_value);
    const hCm = parseFloat(heightM.numeric_value);
    if (w > 0 && hCm > 0) {
      const hM = hCm / 100;
      const bmi = (w / (hM * hM)).toFixed(1);
      result.push({
        id: 'imc-calculated',
        _calculated: true,
        _displayName: t('portal.bmi', 'IMC'),
        _value: bmi,
        _unit: 'kg/m²'
      });
    }
  }

  // 3) Other measures (latest per definition, excluding weight and height)
  for (const [defName, m] of Object.entries(latestByDef)) {
    if (defName === 'weight' || defName === 'height') continue;
    result.push(m);
  }

  return result.slice(0, 5);
};

const PatientPortalDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allMeasures, setAllMeasures] = useState([]);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const handlePreviewDoc = async (doc) => {
    try {
      const blob = await portalService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: doc.mime_type }));
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch {
      toast.error(t('portal.previewError', 'Erreur lors de la visualisation'));
    }
  };

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [measuresData, visitsData, docsData, recipesData, journalData] = await Promise.all([
          portalService.getMeasures().catch(() => ({ measures: [] })),
          portalService.getVisits().catch(() => []),
          portalService.getDocuments().catch(() => []),
          portalService.getRecipes().catch(() => []),
          portalService.getJournalEntries({ limit: 3 }).catch(() => ({ data: [] }))
        ]);
        setAllMeasures(measuresData?.measures || []);
        setVisits((visitsData || []).slice(0, 5));
        setDocuments((docsData || []).slice(0, 5));
        setRecipes((recipesData || []).slice(0, 5));
        setJournalEntries((journalData?.data || []).slice(0, 3));
      } catch (err) {
        setError(t('portal.loadError', 'Erreur lors du chargement des données'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const measures = useMemo(() => buildSummaryMeasures(allMeasures, t), [allMeasures, t]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">
        {t('portal.welcome', 'Bienvenue')}, {user?.username}
      </h2>

      {error && <Alert variant="warning">{error}</Alert>}

      <Row className="g-4">
        {/* Recent Measures */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>📊 {t('portal.recentMeasures', 'Mesures récentes')}</span>
              <Link to="/portal/measures" className="btn btn-sm btn-outline-primary">
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body>
              {measures.length === 0 ? (
                <p className="text-muted">{t('portal.noMeasures', 'Aucune mesure enregistrée')}</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {measures.map(m => (
                    <li key={m.id} className="d-flex justify-content-between py-2 border-bottom">
                      <span>{m._calculated ? m._displayName : (m.measureDefinition?.display_name || m.measureDefinition?.name || '—')}</span>
                      <span className="fw-bold">
                        {m._calculated
                          ? `${m._value} ${m._unit}`
                          : `${m.numeric_value ?? m.text_value ?? (m.boolean_value != null ? String(m.boolean_value) : '—')} ${m.measureDefinition?.unit || ''}`
                        }
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Visits */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>📋 {t('portal.recentVisits', 'Consultations récentes')}</span>
              <Link to="/portal/visits" className="btn btn-sm btn-outline-primary">
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body>
              {visits.length === 0 ? (
                <p className="text-muted">{t('portal.noVisits', 'Aucune consultation')}</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {visits.map(v => (
                    <li key={v.id}>
                      <Link to="/portal/visits" className="d-flex justify-content-between py-2 border-bottom text-decoration-none text-body" style={{ cursor: 'pointer' }}>
                        <span>{new Date(v.visit_date).toLocaleDateString('fr-FR')} — {v.dietitian ? `${v.dietitian.first_name} ${v.dietitian.last_name}` : ''}</span>
                        <span className="text-muted">{v.visit_type || '—'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Documents */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>📄 {t('portal.recentDocuments', 'Documents récents')}</span>
              <Link to="/portal/documents" className="btn btn-sm btn-outline-primary">
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body>
              {documents.length === 0 ? (
                <p className="text-muted">{t('portal.noDocuments', 'Aucun document partagé')}</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {documents.map(d => (
                    <li
                      key={d.id}
                      className="d-flex justify-content-between py-2 border-bottom"
                      style={{ cursor: 'pointer' }}
                      onClick={() => d.document && handlePreviewDoc(d.document)}
                    >
                      <span>{d.document?.file_name || '—'}</span>
                      <span className="text-muted">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Journal */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>{'\uD83D\uDCD3'} {t('portal.recentJournal', 'Journal récent')}</span>
              <Link to="/portal/journal" className="btn btn-sm btn-outline-primary">
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body>
              {journalEntries.length === 0 ? (
                <p className="text-muted">{t('portal.noJournal', 'Aucune entrée dans votre journal')}</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {journalEntries.map(entry => {
                    const moodEmojis = { very_bad: '\uD83D\uDE2B', bad: '\uD83D\uDE1F', neutral: '\uD83D\uDE10', good: '\uD83D\uDE42', very_good: '\uD83D\uDE04' };
                    return (
                      <li key={entry.id}>
                        <Link to="/portal/journal" className="d-flex justify-content-between py-2 border-bottom text-decoration-none text-body" style={{ cursor: 'pointer' }}>
                          <span>
                            {entry.mood && moodEmojis[entry.mood] ? `${moodEmojis[entry.mood]} ` : ''}
                            {entry.title || (entry.content?.substring(0, 50) + (entry.content?.length > 50 ? '...' : ''))}
                          </span>
                          <small className="text-muted">{new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('fr-FR')}</small>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recipes */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>🍽️ {t('portal.recentRecipes', 'Recettes récentes')}</span>
              <Link to="/portal/recipes" className="btn btn-sm btn-outline-primary">
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body>
              {recipes.length === 0 ? (
                <p className="text-muted">{t('portal.noRecipes', 'Aucune recette partagée')}</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {recipes.map(r => (
                    <li key={r.id} className="py-2 border-bottom">
                      <Link to={`/portal/recipes/${r.recipe?.id}`}>
                        {r.recipe?.title || '—'}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Document Preview Modal */}
      <Modal show={!!previewUrl} onHide={closePreview} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>{previewDoc?.file_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ minHeight: '70vh' }}>
          {previewUrl && previewDoc?.mime_type === 'application/pdf' && (
            <iframe
              src={previewUrl}
              title={previewDoc.file_name}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          )}
          {previewUrl && previewDoc?.mime_type?.startsWith('image/') && (
            <div className="text-center p-3">
              <img
                src={previewUrl}
                alt={previewDoc.file_name}
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closePreview}>
            {t('common.close', 'Fermer')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PatientPortalDashboard;
