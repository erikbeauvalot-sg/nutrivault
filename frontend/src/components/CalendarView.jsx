/**
 * CalendarView Component
 * Calendar wrapper using react-big-calendar with visit data
 */

import { useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Badge } from 'react-bootstrap';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
  'fr-FR': fr
};

const CalendarView = ({
  events = [],
  onEventClick,
  onSelectSlot,
  view,
  onViewChange,
  date,
  onNavigate
}) => {
  const { t, i18n } = useTranslation();

  // Setup date-fns localizer with current language
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: locales[locale] }),
    getDay,
    locales
  });

  // Custom event component with status styling
  const EventComponent = ({ event }) => {
    const statusIcons = {
      SCHEDULED: '📅',
      COMPLETED: '✅',
      CANCELLED: '❌',
      NO_SHOW: '👻'
    };

    const statusVariants = {
      SCHEDULED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      NO_SHOW: 'danger'
    };

    return (
      <div className="calendar-event">
        <span className="event-icon">{statusIcons[event.resource?.status] || '📅'}</span>
        <span className="event-title">{event.title}</span>
        <Badge
          bg={statusVariants[event.resource?.status] || 'secondary'}
          className="event-badge"
          pill
        >
          {event.resource?.status}
        </Badge>
      </div>
    );
  };

  // Custom event style getter
  const eventStyleGetter = (event) => {
    const statusColors = {
      SCHEDULED: { backgroundColor: '#0d6efd', borderColor: '#0a58ca' },
      COMPLETED: { backgroundColor: '#198754', borderColor: '#146c43' },
      CANCELLED: { backgroundColor: '#6c757d', borderColor: '#565e64' },
      NO_SHOW: { backgroundColor: '#dc3545', borderColor: '#b02a37' }
    };

    const style = statusColors[event.resource?.status] || statusColors.SCHEDULED;

    return {
      style: {
        ...style,
        color: 'white',
        borderRadius: '4px',
        border: `1px solid ${style.borderColor}`,
        padding: '2px 5px',
        fontSize: '0.85rem'
      }
    };
  };

  // Handle slot selection
  const handleSelectSlot = useCallback((slotInfo) => {
    if (onSelectSlot) {
      onSelectSlot(slotInfo);
    }
  }, [onSelectSlot]);

  // Handle event selection
  const handleSelectEvent = useCallback((event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  }, [onEventClick]);

  // Calendar messages localization
  const messages = {
    today: t('agenda.todayButton'),
    previous: t('common.previous'),
    next: t('common.next'),
    month: t('agenda.monthView'),
    week: t('agenda.weekView'),
    day: t('agenda.dayView'),
    agenda: t('navigation.agenda'),
    date: t('visits.visitDate'),
    time: t('visits.visitTime'),
    event: t('visits.visit'),
    noEventsInRange: t('agenda.noEventsToday'),
    showMore: (total) => `+${total} ${t('common.more') || 'more'}`
  };

  return (
    <div className="calendar-container">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={onViewChange}
        date={date}
        onNavigate={onNavigate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        selectable
        popup
        culture={locale}
        messages={messages}
        components={{
          event: EventComponent
        }}
        eventPropGetter={eventStyleGetter}
        style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}
        step={30}
        timeslots={2}
        defaultView="week"
        views={['month', 'week', 'day']}
        min={new Date(1972, 0, 1, 9, 0, 0)}
        max={new Date(1972, 0, 1, 19, 0, 0)}
      />
    </div>
  );
};

export default CalendarView;
