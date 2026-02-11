/**
 * Patient Portal Dashboard
 * Simplified view: Objectives, Recent Measures, Recent Journal (with comments), Mini Radar
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import * as portalService from '../../services/portalService';
import { normalizeValue } from '../../utils/radarUtils';
import useRefreshOnFocus from '../../hooks/useRefreshOnFocus';

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
        _unit: 'kg/m\u00B2'
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

/**
 * Build mini radar chart data from the first category with values
 */
const buildMiniRadarData = (categories) => {
  if (!categories?.length) return null;
  const excludeTypes = ['separator', 'blank', 'heading', 'paragraph', 'file', 'image'];

  for (const category of categories) {
    if (!category?.fields?.length) continue;
    const chartData = category.fields
      .filter(f => !excludeTypes.includes(f.field_type))
      .map(field => {
        const normalized = normalizeValue(field.value, field);
        return {
          field: field.field_label || field.field_name,
          value: normalized !== null ? normalized : 0,
          hasValue: normalized !== null,
          fullMark: 10
        };
      });

    const fieldsWithValues = chartData.filter(d => d.hasValue).length;
    if (fieldsWithValues > 0) {
      return { data: chartData, color: category.color || '#3498db', name: category.name };
    }
  }
  return null;
};

const PatientPortalDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allMeasures, setAllMeasures] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [radarCategories, setRadarCategories] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    try {
      const [measuresData, journalData, radarData, objectivesData] = await Promise.all([
        portalService.getMeasures().catch(() => ({ measures: [] })),
        portalService.getJournalEntries({ limit: 3 }).catch(() => ({ data: [] })),
        portalService.getRadarData().catch(() => []),
        portalService.getObjectives().catch(() => []),
      ]);
      setAllMeasures(Array.isArray(measuresData?.measures) ? measuresData.measures : []);
      const jEntries = journalData?.data;
      setJournalEntries(Array.isArray(jEntries) ? jEntries.slice(0, 3) : []);
      setRadarCategories(Array.isArray(radarData) ? radarData : []);
      setObjectives(Array.isArray(objectivesData) ? objectivesData : []);
    } catch (err) {
      if (!silent) setError(t('portal.loadError', 'Erreur lors du chargement des donn\u00e9es'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  // Silent refresh for polling & focus return
  const silentRefresh = useCallback(() => loadData(true), [loadData]);
  useRefreshOnFocus(silentRefresh);

  // Poll every 60s for updates
  const pollRef = useRef(null);
  useEffect(() => {
    pollRef.current = setInterval(silentRefresh, 60000);
    return () => clearInterval(pollRef.current);
  }, [silentRefresh]);

  const measures = useMemo(() => buildSummaryMeasures(allMeasures, t), [allMeasures, t]);
  const miniRadar = useMemo(() => buildMiniRadarData(radarCategories), [radarCategories]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const moodEmojis = { very_bad: '\uD83D\uDE2B', bad: '\uD83D\uDE1F', neutral: '\uD83D\uDE10', good: '\uD83D\uDE42', very_good: '\uD83D\uDE04' };

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
        {t('portal.welcome', 'Bienvenue')}, {user?.username}
      </h2>

      {error && <Alert variant="warning">{error}</Alert>}

      <Row className="g-3">
        {/* A. Objectives */}
        <Col xs={12} md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <span style={{ fontSize: '0.9em' }}>{'\uD83C\uDFAF'} {t('portal.myObjectives', 'Mes objectifs')}</span>
            </Card.Header>
            <Card.Body className="py-2 px-3">
              {objectives.length === 0 ? (
                <p className="text-muted mb-0" style={{ fontSize: '0.9em' }}>
                  {t('portal.noObjectives', 'Vos objectifs seront d\u00e9finis avec votre di\u00e9t\u00e9ticien')}
                </p>
              ) : (
                <ol className="mb-0 ps-3" style={{ fontSize: '0.9em' }}>
                  {[1, 2, 3].map(num => {
                    const obj = objectives.find(o => o.objective_number === num);
                    if (!obj) return null;
                    return (
                      <li key={num} className="py-1">
                        {obj.content}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* B. Recent Measures */}
        <Col xs={12} md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <span style={{ fontSize: '0.9em' }}>{'\uD83D\uDCCA'} {t('portal.recentMeasures', 'Mesures r\u00e9centes')}</span>
              <Link to="/portal/measures" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.8em' }}>
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body className="py-2 px-3">
              {measures.length === 0 ? (
                <p className="text-muted mb-0">{t('portal.noMeasures', 'Aucune mesure enregistr\u00e9e')}</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {measures.map(m => {
                    const defId = m._calculated ? null : m.measure_definition_id;
                    const linkTo = defId ? `/portal/measures?def=${defId}` : '/portal/measures';
                    return (
                      <li key={m.id}>
                        <Link to={linkTo} className="d-flex justify-content-between align-items-center py-2 border-bottom text-decoration-none text-body" style={{ gap: '0.5rem', cursor: 'pointer' }}>
                          <span className="text-truncate" style={{ minWidth: 0 }}>
                            {m._calculated ? m._displayName : (m.measureDefinition?.display_name || m.measureDefinition?.name || '\u2014')}
                          </span>
                          <span className="fw-bold text-nowrap">
                            {m._calculated
                              ? `${m._value} ${m._unit}`
                              : `${m.numeric_value ?? m.text_value ?? (m.boolean_value != null ? String(m.boolean_value) : '\u2014')} ${m.measureDefinition?.unit || ''}`
                            }
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* C. Recent Journal (with comments) */}
        <Col xs={12} md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <span style={{ fontSize: '0.9em' }}>{'\uD83D\uDCD3'} {t('portal.recentJournal', 'Journal r\u00e9cent')}</span>
              <Link to="/portal/journal" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.8em' }}>
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body className="py-2 px-3">
              {journalEntries.length === 0 ? (
                <p className="text-muted mb-0">{t('portal.noJournal', 'Aucune entr\u00e9e dans votre journal')}</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {journalEntries.map(entry => {
                    const commentCount = entry.comments?.length || 0;
                    const lastComment = commentCount > 0 ? entry.comments[entry.comments.length - 1] : null;
                    return (
                      <li key={entry.id} className="py-2 border-bottom">
                        <Link to="/portal/journal" className="d-flex justify-content-between align-items-center text-decoration-none text-body" style={{ cursor: 'pointer', gap: '0.5rem' }}>
                          <span className="text-truncate" style={{ minWidth: 0 }}>
                            {entry.mood && moodEmojis[entry.mood] ? `${moodEmojis[entry.mood]} ` : ''}
                            {entry.title || (entry.content?.substring(0, 40) + (entry.content?.length > 40 ? '...' : ''))}
                          </span>
                          <span className="d-flex align-items-center gap-2">
                            {commentCount > 0 && (
                              <Badge bg="info" pill style={{ fontSize: '0.7em' }}>
                                {'\uD83D\uDCAC'} {commentCount}
                              </Badge>
                            )}
                            <small className="text-muted text-nowrap">{new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('fr-FR')}</small>
                          </span>
                        </Link>
                        {lastComment && (
                          <div className="mt-1 ps-2" style={{ fontSize: '0.8em', borderLeft: '2px solid #dee2e6' }}>
                            <span className="text-muted">
                              {lastComment.author?.first_name || t('portal.someone', 'Quelqu\'un')}:
                            </span>{' '}
                            <span className="text-truncate d-inline-block" style={{ maxWidth: '200px', verticalAlign: 'bottom' }}>
                              {lastComment.content?.substring(0, 60)}{lastComment.content?.length > 60 ? '...' : ''}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* D. Mini Radar (Bilan) */}
        <Col xs={12} md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <span style={{ fontSize: '0.9em' }}>{'\uD83C\uDF00'} {t('portal.myAssessment', 'Mon bilan')}</span>
              <Link to="/portal/radar" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.8em' }}>
                {t('common.viewAll', 'Voir tout')}
              </Link>
            </Card.Header>
            <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-center">
              {!miniRadar ? (
                <p className="text-muted mb-0">{t('portal.noAssessment', 'Pas encore de bilan')}</p>
              ) : (
                <div style={{ width: '100%', maxWidth: '280px' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={miniRadar.data}>
                      <PolarGrid gridType="polygon" />
                      <PolarAngleAxis
                        dataKey="field"
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar
                        name={miniRadar.name}
                        dataKey="value"
                        stroke={miniRadar.color}
                        fill={miniRadar.color}
                        fillOpacity={0.3}
                        strokeWidth={2}
                        dot={{ fill: miniRadar.color, r: 3 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PatientPortalDashboard;
