/**
 * CalendarView Component
 * Calendar wrapper using react-big-calendar with solarpunk event colors
 */

import { useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
  'fr-FR': fr
};

// Solarpunk status colors
const STATUS_COLORS = {
  SCHEDULED: { bg: '#3a8a8c', border: '#2e7274' },
  COMPLETED: { bg: '#4b8c50', border: '#3e7a42' },
  CANCELLED: { bg: '#b8a88a', border: '#a09070' },
  NO_SHOW:   { bg: '#c8503c', border: '#a84030' }
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

  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: locales[locale] }),
    getDay,
    locales
  });

  // Simplified event component with status dot + duration
  const EventComponent = ({ event }) => {
    const duration = event.resource?.duration || 30;

    return (
      <div className="calendar-event">
        <span className="event-status-dot" />
        <span className="event-title">{event.title}</span>
        <span className="event-duration">{duration}m</span>
      </div>
    );
  };

  // Solarpunk event style getter
  const eventStyleGetter = (event) => {
    const colors = STATUS_COLORS[event.resource?.status] || STATUS_COLORS.SCHEDULED;

    return {
      style: {
        backgroundColor: colors.bg,
        color: 'white',
        borderRadius: '6px',
        border: 'none',
        padding: '2px 5px',
        fontSize: '0.8rem'
      }
    };
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    if (onSelectSlot) onSelectSlot(slotInfo);
  }, [onSelectSlot]);

  const handleSelectEvent = useCallback((event) => {
    if (onEventClick) onEventClick(event);
  }, [onEventClick]);

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

  // Suppress default toolbar — we use AgendaToolbar in the sidebar
  const EmptyToolbar = () => null;

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
          event: EventComponent,
          toolbar: EmptyToolbar
        }}
        eventPropGetter={eventStyleGetter}
        style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
        step={30}
        timeslots={2}
        defaultView="week"
        views={['month', 'week', 'day']}
        min={new Date(1972, 0, 1, 7, 0, 0)}
        max={new Date(1972, 0, 1, 22, 0, 0)}
        scrollToTime={new Date(1972, 0, 1, 8, 0, 0)}
      />
    </div>
  );
};

export default CalendarView;
