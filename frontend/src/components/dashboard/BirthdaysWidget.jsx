/**
 * Birthdays Widget
 * Shows upcoming patient birthdays (next 7 days)
 */

import { useState } from 'react';
import { Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBirthdayCake } from 'react-icons/fa';
import BirthdayMessageModal from './BirthdayMessageModal';

const BirthdaysWidget = ({ birthdays = [] }) => {
  const { t } = useTranslation();
  const [selectedBirthday, setSelectedBirthday] = useState(null);

  if (!birthdays || birthdays.length === 0) return null;

  return (
    <>
      <Card className="shadow-sm">
        <Card.Header className="d-flex align-items-center gap-2" style={{ backgroundColor: '#fdf2f8', borderBottom: '2px solid #ec4899' }}>
          <FaBirthdayCake color="#ec4899" />
          <h5 className="mb-0" style={{ color: '#be185d' }}>
            {t('dashboard.upcomingBirthdays', 'Anniversaires')}
          </h5>
          <Badge bg="danger" pill className="ms-auto">{birthdays.length}</Badge>
        </Card.Header>
        <ListGroup variant="flush">
          {birthdays.map((b, i) => (
            <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center py-2">
              <div>
                <span className="fw-bold">{b.patient_name}</span>
                <span className="text-muted ms-2 small">
                  {b.age} {t('common.years', 'ans')}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                {b.days_until === 0 ? (
                  <>
                    <Badge bg="danger">
                      {t('dashboard.birthdayToday', "Aujourd'hui")} 🎂
                    </Badge>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      onClick={() => setSelectedBirthday(b)}
                      title={t('dashboard.birthday.sendWish', 'Souhaiter un bon anniversaire')}
                    >
                      💌
                    </Button>
                  </>
                ) : (
                  <Badge bg="warning" text="dark">
                    {t('dashboard.inDays', 'dans {{count}}j', { count: b.days_until })}
                  </Badge>
                )}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>

      {selectedBirthday && (
        <BirthdayMessageModal
          birthday={selectedBirthday}
          onClose={() => setSelectedBirthday(null)}
        />
      )}
    </>
  );
};

export default BirthdaysWidget;
