/**
 * Scheduled Tasks Page
 * Admin page showing all cron jobs, their status, execution history, and manual trigger
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  Badge,
  Form,
  InputGroup,
  Dropdown
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getScheduledJobs, triggerJob, updateJob, toggleJob as toggleJobApi } from '../services/schedulerService';
import {
  FaClock,
  FaPlay,
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPauseCircle,
  FaPen,
  FaTimes,
  FaSave
} from 'react-icons/fa';

const AUTO_REFRESH_INTERVAL = 30000;

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 10 minutes', value: '*/10 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 8:00 AM', value: '0 8 * * *' },
  { label: 'Every Monday at midnight', value: '0 0 * * 1' }
];

// Basic cron validation (5 fields, each with valid chars)
function isValidCron(expr) {
  if (!expr || typeof expr !== 'string') return false;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const pattern = /^(\*|[0-9]+|\*\/[0-9]+|[0-9]+-[0-9]+)(,(\*|[0-9]+|\*\/[0-9]+|[0-9]+-[0-9]+))*$/;
  return parts.every(p => pattern.test(p));
}

const ScheduledTasksPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState({});
  const [triggerSuccess, setTriggerSuccess] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const intervalRef = useRef(null);

  // Inline edit state
  const [editingJob, setEditingJob] = useState(null);
  const [editCron, setEditCron] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState({});

  // Redirect non-admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchJobs = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await getScheduledJobs();
      setJobs(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('scheduledTasks.fetchError', 'Failed to load scheduled tasks'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchJobs(true);
    intervalRef.current = setInterval(() => fetchJobs(false), AUTO_REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchJobs]);

  const handleTrigger = async (jobName) => {
    setTriggering(prev => ({ ...prev, [jobName]: true }));
    setTriggerSuccess(null);
    try {
      await triggerJob(jobName);
      setTriggerSuccess(jobName);
      setTimeout(() => fetchJobs(false), 500);
      setTimeout(() => setTriggerSuccess(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || t('scheduledTasks.triggerError', 'Failed to trigger job'));
    } finally {
      setTriggering(prev => ({ ...prev, [jobName]: false }));
    }
  };

  const handleEditStart = (job) => {
    setEditingJob(job.name);
    setEditCron(job.cronSchedule);
    setSaveSuccess(null);
  };

  const handleEditCancel = () => {
    setEditingJob(null);
    setEditCron('');
  };

  const handleEditSave = async () => {
    if (!isValidCron(editCron)) return;
    setSaving(true);
    try {
      const response = await updateJob(editingJob, { cronSchedule: editCron.trim() });
      setJobs(response.data || []);
      setSaveSuccess(editingJob);
      setEditingJob(null);
      setEditCron('');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || t('scheduledTasks.updateError', 'Failed to update schedule'));
    } finally {
      setSaving(false);
    }
  };

  const handlePresetSelect = (value) => {
    setEditCron(value);
  };

  const handleToggle = async (job) => {
    const newEnabled = !job.isEnabled;
    setToggling(prev => ({ ...prev, [job.name]: true }));
    try {
      const response = await toggleJobApi(job.name, newEnabled);
      setJobs(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || t('scheduledTasks.toggleError', 'Failed to toggle job'));
    } finally {
      setToggling(prev => ({ ...prev, [job.name]: false }));
    }
  };

  const getStatusBadge = (job) => {
    if (!job.isEnabled) {
      return <Badge bg="secondary" className="d-inline-flex align-items-center gap-1"><FaPauseCircle /> {t('scheduledTasks.disabled', 'Disabled')}</Badge>;
    }
    if (job.isExecuting) {
      return <Badge bg="info" className="d-inline-flex align-items-center gap-1"><Spinner animation="border" size="sm" /> {t('scheduledTasks.executing', 'Executing')}</Badge>;
    }
    if (job.lastError) {
      return <Badge bg="danger" className="d-inline-flex align-items-center gap-1"><FaExclamationTriangle /> {t('scheduledTasks.error', 'Error')}</Badge>;
    }
    if (job.isActive) {
      return <Badge bg="success" className="d-inline-flex align-items-center gap-1"><FaCheckCircle /> {t('scheduledTasks.active', 'Active')}</Badge>;
    }
    return <Badge bg="secondary" className="d-inline-flex align-items-center gap-1"><FaPauseCircle /> {t('scheduledTasks.idle', 'Idle')}</Badge>;
  };

  const formatTime = (isoString) => {
    if (!isoString) return t('scheduledTasks.never', 'Never');
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatResult = (result) => {
    if (!result) return '-';
    if (result.totalSent !== undefined) {
      return `${result.totalSent} sent, ${result.totalFailed} failed`;
    }
    if (result.success) return t('scheduledTasks.successResult', 'Completed successfully');
    return JSON.stringify(result);
  };

  const formatJobName = (name) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  };

  if (loading) {
    return (
      <Layout>
        <Container fluid className="py-4">
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">{t('common.loading')}</p>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1 d-flex align-items-center gap-2">
              <FaClock className="text-primary" />
              {t('scheduledTasks.title', 'Scheduled Tasks')}
            </h2>
            <p className="text-muted mb-0">{t('scheduledTasks.subtitle', 'Monitor and manage background cron jobs')}</p>
          </div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => fetchJobs(false)}
            className="d-flex align-items-center gap-1"
          >
            <FaSync /> {t('common.refresh', 'Refresh')}
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {triggerSuccess && (
          <Alert variant="success" dismissible onClose={() => setTriggerSuccess(null)}>
            {t('scheduledTasks.triggerSuccess', 'Job "{{name}}" triggered successfully', { name: formatJobName(triggerSuccess) })}
          </Alert>
        )}

        {saveSuccess && (
          <Alert variant="success" dismissible onClose={() => setSaveSuccess(null)}>
            {t('scheduledTasks.saveSuccess', 'Schedule for "{{name}}" updated successfully', { name: formatJobName(saveSuccess) })}
          </Alert>
        )}

        <Row>
          {jobs.map((job) => (
            <Col key={job.name} lg={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center bg-white">
                  <div>
                    <h5 className="mb-0">{formatJobName(job.name)}</h5>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {getStatusBadge(job)}
                    <Form.Check
                      type="switch"
                      id={`toggle-${job.name}`}
                      checked={job.isEnabled}
                      disabled={toggling[job.name]}
                      onChange={() => handleToggle(job)}
                      title={job.isEnabled
                        ? t('scheduledTasks.clickToDisable', 'Click to disable')
                        : t('scheduledTasks.clickToEnable', 'Click to enable')
                      }
                    />
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted small mb-3">{job.description}</p>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small">{t('scheduledTasks.schedule', 'Schedule')}</span>
                      {editingJob === job.name ? (
                        <div style={{ maxWidth: 340, width: '100%' }}>
                          <InputGroup size="sm" className="mb-1">
                            <Form.Control
                              type="text"
                              value={editCron}
                              onChange={(e) => setEditCron(e.target.value)}
                              isInvalid={editCron.length > 0 && !isValidCron(editCron)}
                              placeholder="* * * * *"
                              style={{ fontFamily: 'monospace' }}
                            />
                            <Dropdown onSelect={handlePresetSelect}>
                              <Dropdown.Toggle variant="outline-secondary" size="sm" id={`preset-${job.name}`}>
                                {t('scheduledTasks.presets', 'Presets')}
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                {CRON_PRESETS.map((preset) => (
                                  <Dropdown.Item key={preset.value} eventKey={preset.value}>
                                    {preset.label} <code className="text-muted ms-2">{preset.value}</code>
                                  </Dropdown.Item>
                                ))}
                              </Dropdown.Menu>
                            </Dropdown>
                          </InputGroup>
                          {editCron.length > 0 && !isValidCron(editCron) && (
                            <Form.Text className="text-danger">
                              {t('scheduledTasks.invalidCron', 'Invalid cron expression')}
                            </Form.Text>
                          )}
                          <div className="d-flex gap-2 mt-2">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!isValidCron(editCron) || saving}
                              onClick={handleEditSave}
                              className="d-flex align-items-center gap-1"
                            >
                              {saving ? <Spinner animation="border" size="sm" /> : <FaSave />}
                              {t('scheduledTasks.save', 'Save')}
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={handleEditCancel}
                              disabled={saving}
                              className="d-flex align-items-center gap-1"
                            >
                              <FaTimes />
                              {t('scheduledTasks.cancel', 'Cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="small fw-semibold d-flex align-items-center gap-1">
                          {job.humanSchedule}
                          <code className="ms-2 text-muted">{job.cronSchedule}</code>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 ms-1 text-muted"
                            onClick={() => handleEditStart(job)}
                            title={t('scheduledTasks.editSchedule', 'Edit schedule')}
                          >
                            <FaPen size={12} />
                          </Button>
                        </span>
                      )}
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted small">{t('scheduledTasks.lastRun', 'Last Run')}</span>
                      <span className="small">{formatTime(job.lastRunAt)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted small">{t('scheduledTasks.lastResult', 'Last Result')}</span>
                      <span className="small">{formatResult(job.lastResult)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted small">{t('scheduledTasks.runCount', 'Run Count')}</span>
                      <span className="small fw-semibold">{job.runCount}</span>
                    </div>
                  </div>

                  {job.lastError && (
                    <Alert variant="danger" className="small py-2 px-3 mb-3">
                      <strong>{t('scheduledTasks.lastErrorLabel', 'Last Error')}:</strong> {job.lastError}
                    </Alert>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white border-top">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={triggering[job.name] || job.isExecuting || !job.isEnabled}
                    onClick={() => handleTrigger(job.name)}
                    className="d-flex align-items-center gap-1"
                  >
                    {triggering[job.name] ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        {t('scheduledTasks.triggering', 'Running...')}
                      </>
                    ) : (
                      <>
                        <FaPlay />
                        {t('scheduledTasks.runNow', 'Run Now')}
                      </>
                    )}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>

        {jobs.length === 0 && !loading && (
          <div className="text-center py-5 text-muted">
            {t('scheduledTasks.noJobs', 'No scheduled tasks found')}
          </div>
        )}

        <p className="text-muted small mt-2">
          {t('scheduledTasks.autoRefresh', 'Auto-refreshes every 30 seconds')}
        </p>
      </Container>
    </Layout>
  );
};

export default ScheduledTasksPage;
