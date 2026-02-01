/**
 * Task Manager Widget
 * Displays and manages tasks
 */

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaCheck, FaTrash, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { getTasks, createTask, completeTask, deleteTask } from '../../services/taskService';

const TaskManagerWidget = () => {
  const { t, i18n } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getTasks();
      if (response.success) {
        setTasks(response.data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const response = await createTask(newTask);
      if (response.success) {
        setTasks([response.data, ...tasks]);
        setShowModal(false);
        setNewTask({ title: '', description: '', due_date: '', priority: 'normal' });
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleCompleteTask = async (id) => {
    try {
      const response = await completeTask(id);
      if (response.success) {
        setTasks(tasks.filter(task => task.id !== id));
      }
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const response = await deleteTask(id);
      if (response.success) {
        setTasks(tasks.filter(task => task.id !== id));
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: { bg: 'secondary', label: t('dashboard.taskPriority.low', 'Basse') },
      normal: { bg: 'primary', label: t('dashboard.taskPriority.normal', 'Normale') },
      high: { bg: 'warning', label: t('dashboard.taskPriority.high', 'Haute') },
      urgent: { bg: 'danger', label: t('dashboard.taskPriority.urgent', 'Urgente') }
    };
    return badges[priority] || badges.normal;
  };

  const formatDueDate = (date) => {
    if (!date) return null;
    const locale = i18n.language === 'fr' ? fr : enUS;
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;

    if (isToday(parsedDate)) {
      return { text: t('dashboard.today', "Aujourd'hui"), isOverdue: false };
    }
    if (isTomorrow(parsedDate)) {
      return { text: t('dashboard.tomorrow', 'Demain'), isOverdue: false };
    }
    if (isPast(parsedDate)) {
      return {
        text: format(parsedDate, 'dd MMM', { locale }),
        isOverdue: true
      };
    }
    return {
      text: format(parsedDate, 'dd MMM', { locale }),
      isOverdue: false
    };
  };

  return (
    <>
      <Card className="h-100 border-0 shadow-sm">
        <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
          <h6 className="mb-0">{t('dashboard.taskManager', 'Tâches à faire')}</h6>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <FaPlus className="me-1" />
            {t('dashboard.addTask', 'Ajouter')}
          </Button>
        </Card.Header>
        <Card.Body className="p-0" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-muted py-5">
              <FaCheck size={32} className="mb-2 text-success" />
              <p className="mb-0">{t('dashboard.noTasks', 'Aucune tâche en attente')}</p>
            </div>
          ) : (
            <ListGroup variant="flush">
              {tasks.map((task) => {
                const dueInfo = formatDueDate(task.due_date);
                const priorityBadge = getPriorityBadge(task.priority);

                return (
                  <ListGroup.Item key={task.id} className="border-0 border-bottom py-3">
                    <div className="d-flex align-items-start">
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="rounded-circle p-1 me-2"
                        style={{ width: 28, height: 28 }}
                        onClick={() => handleCompleteTask(task.id)}
                        title={t('dashboard.markComplete', 'Marquer comme terminée')}
                      >
                        <FaCheck size={12} />
                      </Button>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-center mb-1">
                          <span className="fw-medium text-truncate">{task.title}</span>
                          {task.priority !== 'normal' && (
                            <Badge
                              bg={priorityBadge.bg}
                              className="ms-2"
                              style={{ fontSize: '0.65rem' }}
                            >
                              {priorityBadge.label}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <small className="text-muted d-block text-truncate">
                            {task.description}
                          </small>
                        )}
                        {dueInfo && (
                          <small className={`d-flex align-items-center mt-1 ${dueInfo.isOverdue ? 'text-danger' : 'text-muted'}`}>
                            {dueInfo.isOverdue ? (
                              <FaExclamationTriangle size={10} className="me-1" />
                            ) : (
                              <FaClock size={10} className="me-1" />
                            )}
                            {dueInfo.text}
                          </small>
                        )}
                        {task.patient && (
                          <small className="text-info d-block mt-1">
                            {task.patient.first_name} {task.patient.last_name}
                          </small>
                        )}
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0 ms-2"
                        onClick={() => handleDeleteTask(task.id)}
                        title={t('common.delete', 'Supprimer')}
                      >
                        <FaTrash size={12} />
                      </Button>
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {/* Add Task Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('dashboard.newTask', 'Nouvelle tâche')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTask}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('dashboard.taskTitle', 'Titre')} *</Form.Label>
              <Form.Control
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder={t('dashboard.taskTitlePlaceholder', 'Ex: Appeler patient X')}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('dashboard.taskDescription', 'Description')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder={t('dashboard.taskDescriptionPlaceholder', 'Détails optionnels...')}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('dashboard.dueDate', 'Échéance')}</Form.Label>
              <Form.Control
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('dashboard.priority', 'Priorité')}</Form.Label>
              <Form.Select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <option value="low">{t('dashboard.taskPriority.low', 'Basse')}</option>
                <option value="normal">{t('dashboard.taskPriority.normal', 'Normale')}</option>
                <option value="high">{t('dashboard.taskPriority.high', 'Haute')}</option>
                <option value="urgent">{t('dashboard.taskPriority.urgent', 'Urgente')}</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button variant="primary" type="submit">
              {t('common.create', 'Créer')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default TaskManagerWidget;
