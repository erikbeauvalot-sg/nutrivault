const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');
const { getSessions, getStats, revokeSession, revokeUserSessions } = require('../controllers/sessionController');

// All sessions routes require authentication
router.use(authenticate);

// GET /api/sessions/stats  (must come before /:id to avoid conflict)
router.get('/stats', requirePermission('sessions.read'), getStats);

// GET /api/sessions
router.get('/', requirePermission('sessions.read'), getSessions);

// DELETE /api/sessions/user/:userId  (must come before /:id)
router.delete('/user/:userId', requirePermission('sessions.revoke'), revokeUserSessions);

// DELETE /api/sessions/:id
router.delete('/:id', requirePermission('sessions.revoke'), revokeSession);

module.exports = router;
