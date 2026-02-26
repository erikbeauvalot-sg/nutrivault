/**
 * Patient Portal Progress Page
 * Shows goals with progress charts, achievements/badges, stats, and personalized recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import * as portalService from '../../services/portalService';
import PullToRefreshWrapper from '../../components/common/PullToRefreshWrapper';
import useRefreshOnFocus from '../../hooks/useRefreshOnFocus';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  active: '#2d6a4f',
  completed: '#1b4332',
  abandoned: '#6c757d'
};

const DIRECTION_LABELS = {
  increase: '↑',
  decrease: '↓',
  reach: '◎',
  maintain: '⇔'
};

function progressColor(pct) {
  if (pct === null) return '#adb5bd';
  if (pct >= 100) return '#1b4332';
  if (pct >= 75) return '#2d6a4f';
  if (pct >= 50) return '#52b788';
  if (pct >= 25) return '#74c69d';
  return '#b7e4c7';
}

function daysLeft(targetDate) {
  if (!targetDate) return null;
  const diff = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── Goal Progress Card ────────────────────────────────────────────────────────

const GoalCard = ({ goal, t }) => {
  const pct = goal.progress_pct;
  const color = progressColor(pct);
  const remaining = daysLeft(goal.target_date);
  const hasHistory = goal.history && goal.history.length > 1;

  const chartData = hasHistory
    ? goal.history.map(h => ({
        date: new Date(h.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        value: h.value
      }))
    : [];

  const targetLine = goal.target_value ? parseFloat(goal.target_value) : null;

  return (
    <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      {/* Color accent bar */}
      <div style={{ height: '5px', background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <Card.Body className="p-4">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div className="flex-grow-1 me-2">
            <h6 className="fw-bold mb-1" style={{ fontSize: '1rem', color: '#1b2d1f' }}>
              {DIRECTION_LABELS[goal.direction] || '◎'} {goal.title}
            </h6>
            {goal.description && (
              <p className="text-muted mb-0" style={{ fontSize: '0.82rem' }}>{goal.description}</p>
            )}
          </div>
          <Badge
            style={{
              background: goal.status === 'completed' ? '#1b4332' : goal.status === 'abandoned' ? '#6c757d' : '#2d6a4f',
              borderRadius: '20px',
              fontSize: '0.72rem',
              padding: '4px 10px',
              flexShrink: 0
            }}
          >
            {goal.status === 'completed' ? t('portal.progress.statusCompleted', 'Atteint') :
              goal.status === 'abandoned' ? t('portal.progress.statusAbandoned', 'Abandonné') :
              t('portal.progress.statusActive', 'En cours')}
          </Badge>
        </div>

        {/* Progress Bar */}
        {pct !== null && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span style={{ fontSize: '0.8rem', color: '#52b788', fontWeight: '600' }}>
                {t('portal.progress.progressLabel', 'Progression')}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color }}>
                {pct}%
              </span>
            </div>
            <ProgressBar
              now={pct}
              style={{ height: '8px', borderRadius: '20px', background: '#e9f5ee' }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  borderRadius: '20px',
                  height: '100%',
                  transition: 'width 0.6s ease'
                }}
              />
            </ProgressBar>
          </div>
        )}

        {/* Values */}
        {(goal.current_value !== null || goal.target_value !== null) && (
          <div className="d-flex gap-3 mb-3">
            {goal.current_value !== null && (
              <div className="text-center p-2" style={{ background: '#e9f5ee', borderRadius: '10px', flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: '#52b788', fontWeight: '600' }}>
                  {t('portal.progress.current', 'Actuel')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1b2d1f' }}>
                  {goal.current_value}
                  {goal.measureDefinition?.unit && (
                    <span style={{ fontSize: '0.75rem', color: '#74c69d', marginLeft: '3px' }}>
                      {goal.measureDefinition.unit}
                    </span>
                  )}
                </div>
              </div>
            )}
            {goal.target_value !== null && (
              <div className="text-center p-2" style={{ background: '#f0faf4', borderRadius: '10px', flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: '#52b788', fontWeight: '600' }}>
                  {t('portal.progress.target', 'Objectif')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2d6a4f' }}>
                  {goal.target_value}
                  {goal.measureDefinition?.unit && (
                    <span style={{ fontSize: '0.75rem', color: '#74c69d', marginLeft: '3px' }}>
                      {goal.measureDefinition.unit}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mini Chart */}
        {hasHistory && (
          <div style={{ height: '80px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 2 }}>
                <defs>
                  <linearGradient id={`grad-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9f5ee" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#74c69d' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#74c69d' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                  formatter={(v) => [`${v}${goal.measureDefinition?.unit ? ' ' + goal.measureDefinition.unit : ''}`, goal.measureDefinition?.display_name || '']}
                />
                {targetLine && <ReferenceLine y={targetLine} stroke={color} strokeDasharray="4 4" strokeWidth={1.5} />}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${goal.id})`}
                  dot={false}
                  activeDot={{ r: 4, fill: color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Deadline */}
        {remaining !== null && (
          <div className="mt-2" style={{ fontSize: '0.78rem', color: remaining < 7 && remaining >= 0 ? '#d62828' : '#74c69d' }}>
            {remaining < 0
              ? t('portal.progress.overdue', 'Date dépassée')
              : remaining === 0
              ? t('portal.progress.dueToday', "Échéance aujourd'hui !")
              : t('portal.progress.daysLeft', '{{n}} jours restants', { n: remaining })}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

// ─── Achievement Badge ─────────────────────────────────────────────────────────

const AchievementBadgeCard = ({ achievement }) => (
  <div
    className="d-flex align-items-center gap-3 p-3"
    style={{
      background: '#f0faf4',
      borderRadius: '12px',
      border: '1px solid #b7e4c7',
      transition: 'transform 0.2s'
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #52b788, #2d6a4f)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.4rem',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(45,106,79,0.3)'
      }}
    >
      {achievement.badge_icon || '🏅'}
    </div>
    <div className="flex-grow-1 min-w-0">
      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1b2d1f' }}>{achievement.title}</div>
      {achievement.description && (
        <div style={{ fontSize: '0.78rem', color: '#52b788' }}>{achievement.description}</div>
      )}
    </div>
    <div
      style={{
        background: '#2d6a4f',
        color: '#fff',
        borderRadius: '20px',
        padding: '3px 10px',
        fontSize: '0.75rem',
        fontWeight: '700',
        flexShrink: 0
      }}
    >
      +{achievement.reward_points} pts
    </div>
  </div>
);

// ─── Recommendation Card ───────────────────────────────────────────────────────

const RecommendationCard = ({ rec }) => (
  <div
    className="p-3"
    style={{
      background: 'linear-gradient(135deg, #d8f3dc 0%, #b7e4c7 100%)',
      borderRadius: '12px',
      borderLeft: '4px solid #2d6a4f'
    }}
  >
    <div style={{ fontSize: '0.88rem', color: '#1b2d1f', lineHeight: '1.5' }}>
      {rec.text}
    </div>
    {rec.progress_pct !== null && (
      <div style={{ marginTop: '6px' }}>
        <ProgressBar style={{ height: '4px', borderRadius: '10px', background: '#b7e4c7' }}>
          <div
            style={{
              width: `${rec.progress_pct}%`,
              background: '#2d6a4f',
              borderRadius: '10px',
              height: '100%'
            }}
          />
        </ProgressBar>
      </div>
    )}
  </div>
);

// ─── Stats Card ────────────────────────────────────────────────────────────────

const StatBlock = ({ icon, value, label, color }) => (
  <div
    className="text-center p-3"
    style={{
      background: '#f0faf4',
      borderRadius: '14px',
      border: `1px solid ${color}33`
    }}
  >
    <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{icon}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: '800', color, fontFamily: "'Space Grotesk', sans-serif" }}>
      {value}
    </div>
    <div style={{ fontSize: '0.75rem', color: '#52b788', fontWeight: '600', marginTop: '2px' }}>{label}</div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PatientPortalProgress = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await portalService.getProgress();
      setData(result);
      setError('');
    } catch (err) {
      if (!silent) setError(t('portal.progress.loadError', 'Erreur lors du chargement des données.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);
  useRefreshOnFocus(() => loadData(true));

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" style={{ color: '#2d6a4f' }} />
      </div>
    );
  }

  const goals = data?.goals || [];
  const achievements = data?.achievements || [];
  const recommendations = data?.recommendations || [];
  const stats = data?.stats || {};
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <PullToRefreshWrapper onRefresh={() => loadData(true)}>
      <div style={{ padding: '0 4px' }}>
        {/* Page Header */}
        <div className="mb-4 pb-3" style={{ borderBottom: '2px solid #b7e4c7' }}>
          <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '800', color: '#1b2d1f', marginBottom: '4px' }}>
            🌱 {t('portal.progress.title', 'Mes Progrès')}
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
            {t('portal.progress.subtitle', 'Suivez votre évolution et célébrez vos réussites')}
          </p>
        </div>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        {/* Stats Summary */}
        {stats && (
          <Row className="g-3 mb-4">
            <Col xs={6} sm={3}>
              <StatBlock icon="🎯" value={stats.active_goals || 0} label={t('portal.progress.activeGoals', 'Objectifs actifs')} color="#2d6a4f" />
            </Col>
            <Col xs={6} sm={3}>
              <StatBlock icon="✅" value={stats.completed_goals || 0} label={t('portal.progress.completedGoals', 'Objectifs atteints')} color="#1b4332" />
            </Col>
            <Col xs={6} sm={3}>
              <StatBlock icon="🏅" value={stats.achievements_count || 0} label={t('portal.progress.badges', 'Badges obtenus')} color="#52b788" />
            </Col>
            <Col xs={6} sm={3}>
              <StatBlock icon="⭐" value={stats.total_points || 0} label={t('portal.progress.points', 'Points')} color="#74c69d" />
            </Col>
          </Row>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3" style={{ color: '#1b2d1f', fontFamily: "'Space Grotesk', sans-serif" }}>
                💡 {t('portal.progress.recommendations', 'Recommandations personnalisées')}
              </h6>
              <div className="d-flex flex-column gap-2">
                {recommendations.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} />
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-bold mb-3" style={{ color: '#2d6a4f', fontFamily: "'Space Grotesk', sans-serif" }}>
              🎯 {t('portal.progress.activeGoalsTitle', 'Objectifs en cours')}
            </h6>
            <Row className="g-3">
              {activeGoals.map(goal => (
                <Col key={goal.id} xs={12} md={6} xl={4}>
                  <GoalCard goal={goal} t={t} />
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-bold mb-3" style={{ color: '#1b4332', fontFamily: "'Space Grotesk', sans-serif" }}>
              🏆 {t('portal.progress.completedGoalsTitle', 'Objectifs atteints')}
            </h6>
            <Row className="g-3">
              {completedGoals.map(goal => (
                <Col key={goal.id} xs={12} md={6} xl={4}>
                  <GoalCard goal={goal} t={t} />
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Empty state — no goals */}
        {goals.length === 0 && (
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
            <Card.Body className="text-center py-5">
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌿</div>
              <h6 style={{ color: '#1b2d1f', fontWeight: '700' }}>
                {t('portal.progress.noGoals', 'Pas encore d\'objectifs définis')}
              </h6>
              <p className="text-muted mb-3" style={{ fontSize: '0.88rem' }}>
                {t('portal.progress.noGoalsDesc', 'Votre diététicien définira bientôt des objectifs personnalisés pour vous.')}
              </p>
              <Link to="/portal/measures" className="btn btn-sm" style={{ background: '#2d6a4f', color: '#fff', borderRadius: '20px' }}>
                {t('portal.progress.logMeasures', 'Enregistrer des mesures')}
              </Link>
            </Card.Body>
          </Card>
        )}

        {/* Achievements */}
        <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
          <Card.Body className="p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0" style={{ color: '#1b2d1f', fontFamily: "'Space Grotesk', sans-serif" }}>
                🏅 {t('portal.progress.achievementsTitle', 'Mes badges')}
              </h6>
              {stats.total_points > 0 && (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #52b788, #1b4332)',
                    color: '#fff',
                    borderRadius: '20px',
                    padding: '4px 14px',
                    fontSize: '0.82rem',
                    fontWeight: '700'
                  }}
                >
                  ⭐ {stats.total_points} pts
                </span>
              )}
            </div>

            {achievements.length === 0 ? (
              <div className="text-center py-4">
                <div style={{ fontSize: '2.5rem', marginBottom: '8px', opacity: 0.4 }}>🏅</div>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  {t('portal.progress.noAchievements', 'Continuez à progresser pour débloquer des badges !')}
                </p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {achievements.map(ach => (
                  <AchievementBadgeCard key={ach.id} achievement={ach} />
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Links to other sections */}
        <div className="d-flex flex-wrap gap-2 pb-4">
          <Link to="/portal/measures" className="btn btn-sm" style={{ background: '#e9f5ee', color: '#2d6a4f', borderRadius: '20px', fontWeight: '600' }}>
            📊 {t('portal.nav.measures', 'Mes mesures')}
          </Link>
          <Link to="/portal/journal" className="btn btn-sm" style={{ background: '#e9f5ee', color: '#2d6a4f', borderRadius: '20px', fontWeight: '600' }}>
            📓 {t('portal.nav.journal', 'Mon journal')}
          </Link>
          <Link to="/portal/radar" className="btn btn-sm" style={{ background: '#e9f5ee', color: '#2d6a4f', borderRadius: '20px', fontWeight: '600' }}>
            🌀 {t('portal.nav.radar', 'Mon bilan')}
          </Link>
        </div>
      </div>
    </PullToRefreshWrapper>
  );
};

export default PatientPortalProgress;
