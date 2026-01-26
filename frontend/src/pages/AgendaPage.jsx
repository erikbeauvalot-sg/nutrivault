/**
 * AgendaPage Component
 * Calendar/Agenda view for managing visit appointments
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Card, Alert, Spinner, Button, Badge, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns';
import Layout from '../components/layout/Layout';
import CalendarView from '../components/CalendarView';
import AgendaToolbar from '../components/AgendaToolbar';
import VisitEventModal from '../components/VisitEventModal';
import visitService from '../services/visitService';
import './AgendaPage.css';

const AgendaPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('day');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch visits when view or date changes
  useEffect(() => {
    fetchCalendarVisits();
  }, [view, date]);

  const getDateRange = useCallback(() => {
    let start, end;

    switch (view) {
      case 'day':
        start = new Date(date);
        start.setHours(0, 0, 0, 0);
        end = new Date(date);
        end.setHours(23, 59, 59, 999);
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
        limit: 1000 // Get all visits in the date range
      };

      const response = await visitService.getVisits(filters);
      const data = response.data.data || response.data;
      const visitsArray = Array.isArray(data) ? data : [];

      setVisits(visitsArray);
      setEvents(transformVisitsToEvents(visitsArray));
      setError(null);
    } catch (err) {
      console.error('Error fetching calendar visits:', err);
      setError(err.response?.data?.error || t('visits.failedToLoad'));
      setVisits([]);
      setEvents([]);
    } finally {
      setLoading(false);
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
          duration: duration
        }
      };
    });
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleSelectSlot = (slotInfo) => {
    // Navigate to create visit page with pre-filled date/time
    const visitDate = slotInfo.start.toISOString();
    navigate('/visits/create', { state: { prefilledDate: visitDate } });
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const handleNavigate = (action, newDate) => {
    // Handle calls from react-big-calendar (action is a Date object)
    if (action instanceof Date) {
      setDate(action);
      return;
    }

    // Handle calls from custom AgendaToolbar (action is a string)
    if (action === 'TODAY') {
      setDate(new Date());
    } else if (action === 'PREV') {
      const newCurrentDate = new Date(date);
      switch (view) {
        case 'day':
          newCurrentDate.setDate(date.getDate() - 1);
          break;
        case 'week':
          newCurrentDate.setDate(date.getDate() - 7);
          break;
        case 'month':
          newCurrentDate.setMonth(date.getMonth() - 1);
          break;
        default:
          newCurrentDate.setDate(date.getDate() - 7);
      }
      setDate(newCurrentDate);
    } else if (action === 'NEXT') {
      const newCurrentDate = new Date(date);
      switch (view) {
        case 'day':
          newCurrentDate.setDate(date.getDate() + 1);
          break;
        case 'week':
          newCurrentDate.setDate(date.getDate() + 7);
          break;
        case 'month':
          newCurrentDate.setMonth(date.getMonth() + 1);
          break;
        default:
          newCurrentDate.setDate(date.getDate() + 7);
      }
      setDate(newCurrentDate);
    } else if (newDate) {
      setDate(newDate);
    }
  };

  const handleCreateVisit = () => {
    navigate('/visits/create');
  };

  const getStatusBadge = (status) => {
    const variants = {
      SCHEDULED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      NO_SHOW: 'danger'
    };
    const statusText = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return <Badge bg={variants[status] || 'secondary'}>{statusText[status] || status}</Badge>;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return format(date, 'PPp');
  };

  // Mobile list view
  const renderMobileListView = () => {
    // Group visits by date
    const groupedVisits = visits.reduce((acc, visit) => {
      const dateKey = format(new Date(visit.visit_date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
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
              <strong>{format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}</strong>
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
                        {format(new Date(visit.visit_date), 'p')} - {visit.patient?.first_name} {visit.patient?.last_name}
                      </div>
                      <div className="text-muted small">
                        {visit.duration_minutes || 30} {t('visits.min')}
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(visit.status)}
                    </div>
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
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('agenda.title')}</h2>
          {!isMobile && (
            <Button variant="success" onClick={handleCreateVisit}>
              + {t('visits.createVisit')}
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t('agenda.loadingEvents')}</span>
            </Spinner>
          </div>
        ) : (
          <Card>
            <Card.Body>
              {!isMobile ? (
                <>
                  {/* <AgendaToolbar
                    view={view}
                    onViewChange={handleViewChange}
                    date={date}
                    onNavigate={handleNavigate}
                    onCreateVisit={isMobile ? handleCreateVisit : null}
                  /> */}
                  <CalendarView
                    events={events}
                    onEventClick={handleEventClick}
                    onSelectSlot={handleSelectSlot}
                    view={view}
                    onViewChange={handleViewChange}
                    date={date}
                    onNavigate={handleNavigate}
                  />
                </>
              ) : (
                <>
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{t('agenda.listView')}</h5>
                    <Button variant="success" size="sm" onClick={handleCreateVisit}>
                      + {t('visits.createVisit')}
                    </Button>
                  </div>
                  {renderMobileListView()}
                </>
              )}
            </Card.Body>
          </Card>
        )}

        <VisitEventModal
          show={showEventModal}
          onHide={() => setShowEventModal(false)}
          event={selectedEvent}
        />
      </Container>
    </Layout>
  );
};

export default AgendaPage;
