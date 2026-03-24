/**
 * IP Blacklist Management Page
 * Admin-only page for viewing and managing blocked IP addresses
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Table, Badge, Form,
  InputGroup, Modal, Spinner
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { toast } from 'react-toastify';
import { FaShieldAlt, FaTrash, FaPlus, FaUnlock, FaRobot, FaUser } from 'react-icons/fa';
import api from '../services/api';

const IpBlacklistPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState('true');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') navigate('/dashboard');
  }, [user, navigate]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterActive !== 'all' ? { active: filterActive } : {};
      const res = await api.get('/ip-blacklist', { params });
      setEntries(res.data.data || []);
    } catch {
      toast.error(t('ipBlacklist.fetchError', 'Impossible de charger la liste'));
    } finally {
      setLoading(false);
    }
  }, [filterActive, t]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleUnblock = async (entry) => {
    setUnblockingId(entry.id);
    try {
      await api.delete(`/ip-blacklist/${entry.id}`);
      toast.success(t('ipBlacklist.unblockSuccess', 'IP débloquée'));
      loadEntries();
    } catch {
      toast.error(t('ipBlacklist.unblockError', 'Erreur lors du déblocage'));
    } finally {
      setUnblockingId(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    setAdding(true);
    try {
      await api.post('/ip-blacklist', { ip_address: newIp.trim(), reason: newReason.trim() || undefined });
      toast.success(t('ipBlacklist.addSuccess', 'IP bloquée'));
      setShowAddModal(false);
      setNewIp('');
      setNewReason('');
      loadEntries();
    } catch {
      toast.error(t('ipBlacklist.addError', 'Erreur lors du blocage'));
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('fr-FR') : '—';

  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4 align-items-center">
          <Col>
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <FaShieldAlt size={22} color="white" />
              </div>
              <div>
                <h1 className="mb-0 fw-bold" style={{ fontSize: '1.6rem' }}>
                  {t('ipBlacklist.title', 'Liste noire des IPs')}
                </h1>
                <p className="text-muted mb-0 small">
                  {t('ipBlacklist.subtitle', 'Gérez les adresses IP bloquées sur votre plateforme')}
                </p>
              </div>
            </div>
          </Col>
          <Col xs="auto" className="d-flex gap-2 align-items-center">
            <Form.Select
              size="sm"
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="true">{t('ipBlacklist.filterActive', 'Actives')}</option>
              <option value="false">{t('ipBlacklist.filterInactive', 'Débloquées')}</option>
              <option value="all">{t('ipBlacklist.filterAll', 'Toutes')}</option>
            </Form.Select>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="d-flex align-items-center gap-2"
            >
              <FaPlus size={12} />
              {t('ipBlacklist.addBtn', 'Bloquer une IP')}
            </Button>
          </Col>
        </Row>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="danger" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FaShieldAlt size={40} className="mb-3 opacity-25" />
                <p>{t('ipBlacklist.empty', 'Aucune entrée trouvée')}</p>
              </div>
            ) : (
              <Table hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('ipBlacklist.colIp', 'Adresse IP')}</th>
                    <th>{t('ipBlacklist.colReason', 'Raison')}</th>
                    <th>{t('ipBlacklist.colType', 'Type')}</th>
                    <th>{t('ipBlacklist.colBlockedAt', 'Bloquée le')}</th>
                    <th>{t('ipBlacklist.colStatus', 'Statut')}</th>
                    <th>{t('ipBlacklist.colUnblockedAt', 'Débloquée le')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      <td>
                        <code className="fw-bold" style={{ fontSize: '0.95rem' }}>
                          {entry.ip_address}
                        </code>
                      </td>
                      <td className="text-muted small" style={{ maxWidth: 260 }}>
                        {entry.reason || '—'}
                      </td>
                      <td>
                        {entry.auto_blocked ? (
                          <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                            <FaRobot size={10} />
                            {t('ipBlacklist.typeAuto', 'Auto')}
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                            <FaUser size={10} />
                            {t('ipBlacklist.typeManual', 'Manuel')}
                          </Badge>
                        )}
                      </td>
                      <td className="small text-muted">{formatDate(entry.blocked_at)}</td>
                      <td>
                        {entry.is_active ? (
                          <Badge bg="danger">{t('ipBlacklist.statusBlocked', 'Bloquée')}</Badge>
                        ) : (
                          <Badge bg="success">{t('ipBlacklist.statusUnblocked', 'Débloquée')}</Badge>
                        )}
                      </td>
                      <td className="small text-muted">{formatDate(entry.unblocked_at)}</td>
                      <td>
                        {entry.is_active && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleUnblock(entry)}
                            disabled={unblockingId === entry.id}
                            className="d-flex align-items-center gap-1"
                          >
                            {unblockingId === entry.id
                              ? <Spinner size="sm" animation="border" />
                              : <FaUnlock size={12} />
                            }
                            {t('ipBlacklist.unblockBtn', 'Débloquer')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Add IP Modal */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <FaShieldAlt className="me-2 text-danger" />
              {t('ipBlacklist.addTitle', 'Bloquer une adresse IP')}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleAdd}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>{t('ipBlacklist.ipLabel', 'Adresse IP')}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="ex: 192.168.1.1"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  required
                  autoFocus
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>{t('ipBlacklist.reasonLabel', 'Raison (optionnel)')}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t('ipBlacklist.reasonPlaceholder', 'Décrivez la raison du blocage...')}
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button variant="danger" type="submit" disabled={adding}>
                {adding ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                {t('ipBlacklist.addBtn', 'Bloquer')}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </Layout>
  );
};

export default IpBlacklistPage;
