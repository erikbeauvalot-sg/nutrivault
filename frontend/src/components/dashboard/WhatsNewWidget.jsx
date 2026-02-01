/**
 * What's New Widget
 * Displays recent feature updates and changelog
 */

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Badge, Button, Collapse } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaGift, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { getWhatsNew } from '../../services/dashboardService';

const WhatsNewWidget = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchWhatsNew();
  }, [i18n.language]);

  const fetchWhatsNew = async () => {
    try {
      setLoading(true);
      const response = await getWhatsNew(i18n.language);
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Error fetching what\'s new:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return null;
  }

  const { changelog, currentVersion } = data;

  return (
    <Card className="border-0 shadow-sm mb-4 border-start border-4 border-primary">
      <Card.Header
        className="bg-white border-0 d-flex justify-content-between align-items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center">
          <FaGift className="text-primary me-2" />
          <h6 className="mb-0">
            {t('dashboard.whatsNew', 'Nouveautés')}
            <Badge bg="primary" className="ms-2" style={{ fontSize: '0.7rem' }}>
              v{currentVersion}
            </Badge>
          </h6>
        </div>
        <Button variant="link" className="p-0 text-muted">
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </Button>
      </Card.Header>
      <Collapse in={expanded}>
        <div>
          <Card.Body className="pt-0">
            <p className="text-muted small mb-3">
              {changelog.title} - {new Date(changelog.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <ListGroup variant="flush" className="small">
              {changelog.features.map((feature, index) => (
                <ListGroup.Item key={index} className="px-0 py-2 border-0">
                  <div className="d-flex align-items-start">
                    <span className="me-2" style={{ fontSize: '1.1rem' }}>{feature.icon}</span>
                    <div>
                      <strong>{feature.title}</strong>
                      <p className="mb-0 text-muted">{feature.description}</p>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </div>
      </Collapse>
    </Card>
  );
};

export default WhatsNewWidget;
