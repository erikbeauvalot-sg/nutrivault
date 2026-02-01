/**
 * Activity Feed Widget
 * Displays recent activity in the practice
 */

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { getActivityFeed } from '../../services/dashboardService';

const ActivityFeedWidget = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await getActivityFeed(15);
      if (response.success) {
        setActivities(response.data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLocale = () => {
    return i18n.language === 'fr' ? fr : enUS;
  };

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: getLocale()
      });
    } catch {
      return '';
    }
  };

  const getColorClass = (color) => {
    const colorMap = {
      primary: 'primary',
      success: 'success',
      warning: 'warning',
      danger: 'danger',
      info: 'info'
    };
    return colorMap[color] || 'secondary';
  };

  const handleActivityClick = (activity) => {
    if (activity.patient_id) {
      navigate(`/patients/${activity.patient_id}`);
    }
  };

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Header className="bg-white border-0">
        <h6 className="mb-0">{t('dashboard.activityFeed', 'Activité récente')}</h6>
      </Card.Header>
      <Card.Body className="p-0" style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-muted py-5">
            {t('dashboard.noActivity', 'Aucune activité récente')}
          </div>
        ) : (
          <ListGroup variant="flush">
            {activities.map((activity) => (
              <ListGroup.Item
                key={activity.id}
                action={!!activity.patient_id}
                onClick={() => handleActivityClick(activity)}
                className="border-0 border-bottom py-3"
              >
                <div className="d-flex align-items-start">
                  <span
                    className="me-3"
                    style={{ fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}
                  >
                    {activity.icon}
                  </span>
                  <div className="flex-grow-1 min-w-0">
                    <p className="mb-1 text-truncate">
                      {activity.message}
                    </p>
                    <small className="text-muted">
                      {formatTime(activity.created_at)}
                    </small>
                  </div>
                  <Badge
                    bg={getColorClass(activity.color)}
                    className="ms-2 align-self-center"
                    style={{ opacity: 0.7 }}
                  >
                    &nbsp;
                  </Badge>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default ActivityFeedWidget;
