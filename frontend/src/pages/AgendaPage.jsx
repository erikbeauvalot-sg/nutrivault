/**
 * AgendaPage Component
 * Split layout: sidebar (toolbar + today's schedule) | calendar
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Alert, Spinner, Badge, Card, ListGroup, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import Layout from '../components/layout/Layout';
import CalendarView from '../components/CalendarView';
import AgendaToolbar from '../components/AgendaToolbar';
import VisitEventModal from '../components/VisitEventModal';
import CreateVisitModal from '../components/CreateVisitModal';
import visitService from '../services/visitService';
import './AgendaPage.css';

const AgendaPage = () => {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language?.startsWith('fr') ? fr : enUS;
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [todaysVisits, setTodaysVisits] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalDate, setCreateModalDate] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch calendar visits when view or date changes
  useEffect(() => {
    fetchCalendarVisits();
  }, [view, date]);

  // Fetch today's visits once on mount
  useEffect(() => {
    fetchTodaysVisits();
  }, []);

  const getDateRange = useCallback(() => {
    let start, end;
    switch (view) {
      case 'day':
        start = startOfDay(date);
        end = endOfDay(date);
        break;
      case 'week':
        start = startOfWeek(date);
        end = endOfWeek(date);
        break;
      case 'month':
        start = startOfWeek(startOfMonth(date));
        end = endOfWeek(endOfMonth(date));
        break;
      default:
        start = startOfWeek(date);
        end = endOfWeek(date);
    }
    return { start, end };
  }, [view, date]);

  const fetchCalendarVisits = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      const filters = {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        limit: 1000
      };
      const { data } = await visitService.getVisits(filters);
      const visitsArray = Array.isArray(data) ? data : [];
      setVisits(visitsArray);
      setEvents(transformVisitsToEvents(visitsArray));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('visits.failedToLoad'));
      setVisits([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysVisits = async () => {
    try {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);
      const { data } = await visitService.getVisits({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        limit: 100
      });
      const arr = Array.isArray(data) ? data : [];
      // Sort by visit_date ascending
      arr.sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
      setTodaysVisits(arr);
    } catch {
      setTodaysVisits([]);
    }
  };

  const transformVisitsToEvents = (visits) => {
    return visits.map(visit => {
      const startDate = new Date(visit.visit_date);
      const duration = visit.duration_minutes || 30;
      const endDate = new Date(startDate.getTime() + duration * 60000);
      return {
        id: visit.id,
        title: `${visit.patient?.first_name || ''} ${visit.patient?.last_name || ''}`.trim() || t('visits.unknown'),
        start: startDate,
        end: endDate,
        resource: {
          visitId: visit.id,
          status: visit.status,
          visitType: visit.visit_type,
          patientName: `${visit.patient?.first_name || ''} ${visit.patient?.last_name || ''}`.trim() || t('visits.unknown'),
          duration
        }
      };
    });
  };

  // Stats computed from both today's visits and all calendar visits
  const stats = useMemo(() => {
    const todayTotal = todaysVisits.length;
    const completed = todaysVisits.filter(v => v.status === 'COMPLETED').length;
    const noShows = todaysVisits.filter(v => v.status === 'NO_SHOW').length;
    // "This week" counts all visits currently fetched when in week view,
    // otherwise count visits from the current week range
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const thisWeek = visits.filter(v => {
      const d = new Date(v.visit_date);
      return d >= weekStart && d <= weekEnd;
    }).length;

    return { todayTotal, completed, thisWeek, noShows };
  }, [todaysVisits, visits]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleSelectSlot = (slotInfo) => {
    setCreateModalDate(slotInfo.start.toISOString());
    setShowCreateModal(true);
  };

  const handleViewChange = (newView) => setView(newView);

  const handleNavigate = (action) => {
    if (action instanceof Date) {
      setDate(action);
      return;
    }
    if (action === 'TODAY') {
      setDate(new Date());
    } else if (action === 'PREV') {
      const d = new Date(date);
      if (view === 'day') d.setDate(d.getDate() - 1);
      else if (view === 'week') d.setDate(d.getDate() - 7);
      else if (view === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 7);
      setDate(d);
    } else if (action === 'NEXT') {
      const d = new Date(date);
      if (view === 'day') d.setDate(d.getDate() + 1);
      else if (view === 'week') d.setDate(d.getDate() + 7);
      else if (view === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 7);
      setDate(d);
    }
  };

  const handleCreateVisit = () => {
    setCreateModalDate(null);
    setShowCreateModal(true);
  };

  const handleVisitCreated = () => {
    fetchCalendarVisits();
    fetchTodaysVisits();
  };

  const getStatusBadge = (status) => {
    const variants = {
      SCHEDULED: 'info', COMPLETED: 'success', CANCELLED: 'secondary', NO_SHOW: 'danger'
    };
    const statusText = {
      SCHEDULED: t('visits.scheduled'), COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'), NO_SHOW: t('visits.noShow')
    };
    return <Badge bg={variants[status] || 'secondary'}>{statusText[status] || status}</Badge>;
  };

  // ── Stats Row ───────────────────────────────────
  const renderStats = () => (
    <div className="agenda-stats">
      <div className="agenda-stat-card">
        <div className="agenda-stat-icon agenda-stat-icon--today">&#9679;</div>
        <div>
          <div className="agenda-stat-value">{stats.todayTotal}</div>
          <div className="agenda-stat-label">{t('agenda.todayCount')}</div>
        </div>
      </div>
      <div className="agenda-stat-card">
        <div className="agenda-stat-icon agenda-stat-icon--completed">&#10003;</div>
        <div>
          <div className="agenda-stat-value">{stats.completed}</div>
          <div className="agenda-stat-label">{t('agenda.completedCount')}</div>
        </div>
      </div>
      <div className="agenda-stat-card">
        <div className="agenda-stat-icon agenda-stat-icon--week">&#9733;</div>
        <div>
          <div className="agenda-stat-value">{stats.thisWeek}</div>
          <div className="agenda-stat-label">{t('agenda.upcomingWeek')}</div>
        </div>
      </div>
      <div className="agenda-stat-card">
        <div className="agenda-stat-icon agenda-stat-icon--noshow">&#10007;</div>
        <div>
          <div className="agenda-stat-value">{stats.noShows}</div>
          <div className="agenda-stat-label">{t('agenda.noShowCount')}</div>
        </div>
      </div>
    </div>
  );

  // ── Today's Schedule Panel ──────────────────────
  const renderTodayPanel = () => (
    <div className="agenda-today-panel">
      <div className="agenda-today-header">
        {t('agenda.todaysSchedule')}
      </div>
      <div className="agenda-today-list">
        {todaysVisits.length === 0 ? (
          <div className="agenda-today-empty">
            {t('agenda.noAppointmentsToday')}
          </div>
        ) : (
          todaysVisits.map(visit => (
            <div
              key={visit.id}
              className="agenda-today-item"
              onClick={() => navigate(`/visits/${visit.id}`)}
            >
              <span className="agenda-today-time">
                {format(new Date(visit.visit_date), 'HH:mm')}
              </span>
              <span className="agenda-today-name">
                {visit.patient?.first_name} {visit.patient?.last_name}
              </span>
              <span className="agenda-today-duration">
                {visit.duration_minutes || 30}{t('agenda.minutesShort')}
              </span>
              <span className={`agenda-today-dot agenda-today-dot--${visit.status}`} />
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ── Mobile List View ────────────────────────────
  const renderMobileListView = () => {
    const groupedVisits = visits.reduce((acc, visit) => {
      const dateKey = format(new Date(visit.visit_date), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(visit);
      return acc;
    }, {});
    const sortedDates = Object.keys(groupedVisits).sort();

    if (sortedDates.length === 0) {
      return (
        <Alert variant="info" className="text-center">
          {t('agenda.noEventsToday')}
        </Alert>
      );
    }

    return (
      <div className="mobile-list-view">
        {sortedDates.map(dateKey => (
          <Card key={dateKey} className="mb-3">
            <Card.Header>
              <strong>{format(new Date(dateKey), 'EEEE d MMMM yyyy', { locale: dateFnsLocale })}</strong>
            </Card.Header>
            <ListGroup variant="flush">
              {groupedVisits[dateKey].map(visit => (
                <ListGroup.Item
                  key={visit.id}
                  action
                  onClick={() => navigate(`/visits/${visit.id}`)}
                  className="visit-list-item"
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="fw-bold">
                        {format(new Date(visit.visit_date), 'HH:mm', { locale: dateFnsLocale })} - {visit.patient?.first_name} {visit.patient?.last_name}
                      </div>
                      <div className="text-muted small">
                        {visit.duration_minutes || 30} {t('visits.min')}
                      </div>
                    </div>
                    <div>{getStatusBadge(visit.status)}</div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <Container fluid className="agenda-page py-4">
        <h2 className="mb-3">{t('agenda.title')}</h2>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats row — always visible */}
        {renderStats()}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t('agenda.loadingEvents')}</span>
            </Spinner>
          </div>
        ) : (
          <>
            {/* Desktop: split layout */}
            {!isMobile && (
              <div className="agenda-split">
                <div className="agenda-sidebar">
                  <AgendaToolbar
                    view={view}
                    onViewChange={handleViewChange}
                    date={date}
                    onNavigate={handleNavigate}
                    onCreateVisit={handleCreateVisit}
                  />
                  {renderTodayPanel()}
                </div>
                <div className="agenda-main">
                  <CalendarView
                    events={events}
                    onEventClick={handleEventClick}
                    onSelectSlot={handleSelectSlot}
                    view={view}
                    onViewChange={handleViewChange}
                    date={date}
                    onNavigate={handleNavigate}
                  />
                </div>
              </div>
            )}

            {/* Mobile: create button + list view */}
            {isMobile && (
              <div className="agenda-mobile-section">
                <Button
                  className="agenda-mobile-create agenda-toolbar-create mb-3"
                  onClick={handleCreateVisit}
                >
                  + {t('agenda.newAppointment')}
                </Button>
                {renderMobileListView()}
              </div>
            )}
          </>
        )}

        <VisitEventModal
          show={showEventModal}
          onHide={() => setShowEventModal(false)}
          event={selectedEvent}
        />

        <CreateVisitModal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          onSuccess={handleVisitCreated}
          prefilledDate={createModalDate}
        />
      </Container>
    </Layout>
  );
};

export default AgendaPage;
