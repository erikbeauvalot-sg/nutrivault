/**
 * AgendaToolbar Component
 * Navigation toolbar for the calendar view with view toggle and date navigation
 */

import { Button, ButtonGroup, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
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

  // Format current date range based on view
  const getDateRangeLabel = () => {
    if (!date) return '';

    switch (view) {
      case 'day':
        return format(date, 'EEEE, MMMM d, yyyy', { locale });
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${format(weekStart, 'MMM d', { locale })} - ${format(weekEnd, 'MMM d, yyyy', { locale })}`;
      }
      case 'month':
        return format(date, 'MMMM yyyy', { locale });
      default:
        return format(date, 'MMMM yyyy', { locale });
    }
  };

  return (
    <div className="agenda-toolbar mb-3">
      <Row className="align-items-center">
        <Col xs={12} md={4} className="mb-2 mb-md-0">
          <ButtonGroup size="sm">
            <Button
              variant="outline-primary"
              onClick={() => onNavigate('PREV')}
              title={t('common.previous')}
            >
              ‹
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => onNavigate('TODAY')}
            >
              {t('agenda.todayButton')}
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => onNavigate('NEXT')}
              title={t('common.next')}
            >
              ›
            </Button>
          </ButtonGroup>
        </Col>

        <Col xs={12} md={4} className="text-center mb-2 mb-md-0">
          <h5 className="mb-0 date-range-label">{getDateRangeLabel()}</h5>
        </Col>

        <Col xs={12} md={4} className="text-md-end">
          <ButtonGroup size="sm" className="me-2">
            <Button
              variant={view === 'day' ? 'primary' : 'outline-primary'}
              onClick={() => onViewChange('day')}
            >
              {t('agenda.dayView')}
            </Button>
            <Button
              variant={view === 'week' ? 'primary' : 'outline-primary'}
              onClick={() => onViewChange('week')}
            >
              {t('agenda.weekView')}
            </Button>
            <Button
              variant={view === 'month' ? 'primary' : 'outline-primary'}
              onClick={() => onViewChange('month')}
            >
              {t('agenda.monthView')}
            </Button>
          </ButtonGroup>
          {onCreateVisit && (
            <Button
              variant="success"
              size="sm"
              onClick={onCreateVisit}
            >
              + {t('visits.createVisit')}
            </Button>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default AgendaToolbar;
