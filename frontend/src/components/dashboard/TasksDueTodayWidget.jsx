/**
 * Tasks Due Today Widget
 * Compact list of tasks due today, with priority badges
 */

import { useState, useEffect } from 'react';
import { Card, ListGroup, Badge, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaTasks, FaCheckCircle } from 'react-icons/fa';
import api from '../../services/api';

const PRIORITY_COLORS = {
  urgent: 'danger',
  high: 'warning',
  normal: 'info',
  low: 'secondary',
};

const TasksDueTodayWidget = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await api.get(`/dashboard/tasks?due_date=${today}&status=pending,in_progress`);
      setTasks(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching tasks due today:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId, e) => {
    e.stopPropagation();
    try {
      await api.put(`/dashboard/tasks/${taskId}/complete`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-4">
          <Spinner size="sm" animation="border" />
        </Card.Body>
      </Card>
    );
  }

  if (tasks.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex align-items-center gap-2" style={{ backgroundColor: '#eef2ff', borderBottom: '2px solid #4f46e5' }}>
        <FaTasks color="#4f46e5" />
        <h5 className="mb-0" style={{ color: '#3730a3' }}>
          {t('dashboard.tasksDueToday', 'Tâches du jour')}
        </h5>
        <Badge bg="primary" pill className="ms-auto">{tasks.length}</Badge>
      </Card.Header>
      <ListGroup variant="flush">
        {tasks.map(task => (
          <ListGroup.Item key={task.id} className="d-flex justify-content-between align-items-center py-2">
            <div className="d-flex align-items-center gap-2">
              <Badge bg={PRIORITY_COLORS[task.priority] || 'info'} className="text-uppercase" style={{ fontSize: '0.65rem' }}>
                {task.priority}
              </Badge>
              <span className={task.status === 'completed' ? 'text-decoration-line-through text-muted' : ''}>
                {task.title}
              </span>
              {task.patient && (
                <span className="text-muted small ms-1">
                  — {task.patient.first_name} {task.patient.last_name}
                </span>
              )}
            </div>
            <button
              className="btn btn-sm btn-outline-success border-0"
              onClick={(e) => handleComplete(task.id, e)}
              title={t('tasks.complete', 'Terminer')}
            >
              <FaCheckCircle />
            </button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};

export default TasksDueTodayWidget;
