/**
 * AgendaToolbar Component
 * Vertical sidebar toolbar: navigation, view toggle, create button
 */

import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';

const AgendaToolbar = ({
  view,
  onViewChange,
  date,
  onNavigate,
  onCreateVisit
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : enUS;

  const getDateRangeLabel = () => {
    if (!date) return '';
    const currentDate = date instanceof Date ? date : new Date(date);

    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE d MMMM', { locale });
      case 'week': {
        const weekStart = startOfWeek(currentDate, { locale });
        const weekEnd = endOfWeek(currentDate, { locale });
        return `${format(weekStart, 'MMM d', { locale })} – ${format(weekEnd, 'MMM d', { locale })}`;
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale });
      default:
        return format(currentDate, 'MMMM yyyy', { locale });
    }
  };

  return (
    <div className="agenda-toolbar-card">
      {/* Navigation row */}
      <div className="agenda-toolbar-nav">
        <button className="btn-nav" onClick={() => onNavigate('PREV')} title={t('common.previous')}>
          ‹
        </button>
        <button className="btn-today" onClick={() => onNavigate('TODAY')}>
          {t('agenda.todayButton')}
        </button>
        <button className="btn-nav" onClick={() => onNavigate('NEXT')} title={t('common.next')}>
          ›
        </button>
      </div>

      {/* Date label */}
      <div className="agenda-toolbar-date">
        {getDateRangeLabel()}
      </div>

      {/* View toggle */}
      <div className="agenda-toolbar-views">
        <button
          className={`btn-view ${view === 'day' ? 'btn-view--active' : ''}`}
          onClick={() => onViewChange('day')}
        >
          {t('agenda.dayView')}
        </button>
        <button
          className={`btn-view ${view === 'week' ? 'btn-view--active' : ''}`}
          onClick={() => onViewChange('week')}
        >
          {t('agenda.weekView')}
        </button>
        <button
          className={`btn-view ${view === 'month' ? 'btn-view--active' : ''}`}
          onClick={() => onViewChange('month')}
        >
          {t('agenda.monthView')}
        </button>
      </div>

      {/* Create button */}
      {onCreateVisit && (
        <button className="agenda-toolbar-create" onClick={onCreateVisit}>
          + {t('agenda.newAppointment')}
        </button>
      )}
    </div>
  );
};

export default AgendaToolbar;
