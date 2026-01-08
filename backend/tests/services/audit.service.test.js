/**
 * Audit Service Unit Tests
 */

const auditService = require('../../src/services/audit.service');
const db = require('../../models');
const { createRole, createUser } = require('../helpers');

describe('Audit Service', () => {
  let testUser;

  beforeEach(async () => {
    const role = await createRole({ name: 'ADMIN' });
    testUser = await createUser({ username: 'auditloguser', email: 'auditloguser@example.com', role });
  });

  describe('logAuditEvent', () => {
    it('should create audit log successfully', async () => {
      const auditData = {
        user_id: testUser.id,
        username: testUser.username,
        action: 'CREATE',
        resource_type: 'patients',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'POST',
        request_path: '/api/patients',
        status: 'SUCCESS',
        severity: 'INFO'
      };

      await auditService.logAuditEvent(auditData);

      const logs = await db.AuditLog.findAll({
        where: { username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('CREATE');
      expect(logs[0].resource_type).toBe('patients');
      expect(logs[0].status).toBe('SUCCESS');
    });

    it('should handle changes object', async () => {
      const auditData = {
        username: 'testuser',
        action: 'UPDATE',
        resource_type: 'patients',
        changes: {
          before: { name: 'John' },
          after: { name: 'Jane' }
        }
      };

      await auditService.logAuditEvent(auditData);

      const logs = await db.AuditLog.findAll({
        where: { action: 'UPDATE' }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].changes).toBeDefined();
      expect(logs[0].changes.before).toEqual({ name: 'John' });
      expect(logs[0].changes.after).toEqual({ name: 'Jane' });
    });

    it('should use default values for optional fields', async () => {
      const auditData = {
        action: 'READ',
        resource_type: 'patients'
      };

      await auditService.logAuditEvent(auditData);

      const logs = await db.AuditLog.findAll({
        where: { action: 'READ', resource_type: 'patients' }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('SUCCESS');
      expect(logs[0].severity).toBe('INFO');
      expect(logs[0].user_id).toBeNull();
    });

    it('should not throw error on database failure', async () => {
      // Mock the create method to simulate a database error
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockRejectedValue(new Error('DB Error'));

      // Should not throw - errors are caught and logged
      await expect(
        auditService.logAuditEvent({
          action: 'TEST',
          resource_type: 'test'
        })
      ).resolves.not.toThrow();

      // Restore original method
      db.AuditLog.create = originalCreate;
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful login', async () => {
      await auditService.logAuthEvent({
        user_id: testUser.id,
        username: testUser.username,
        action: 'LOGIN',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: 'SUCCESS'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'LOGIN', status: 'SUCCESS', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].resource_type).toBe('auth');
      expect(logs[0].severity).toBe('INFO');
    });

    it('should log failed login with WARN severity', async () => {
      await auditService.logAuthEvent({
        username: 'baduser',
        action: 'FAILED_LOGIN',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: 'FAILURE',
        error_message: 'Invalid credentials'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'FAILED_LOGIN' }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('FAILURE');
      expect(logs[0].severity).toBe('WARN');
      expect(logs[0].error_message).toBe('Invalid credentials');
    });

    it('should log logout', async () => {
      await auditService.logAuthEvent({
        user_id: testUser.id,
        username: testUser.username,
        action: 'LOGOUT',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'LOGOUT', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].resource_type).toBe('auth');
    });

    it('should log token refresh', async () => {
      await auditService.logAuthEvent({
        user_id: testUser.id,
        username: testUser.username,
        action: 'TOKEN_REFRESH',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'TOKEN_REFRESH', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
    });
  });

  describe('logAuthorizationFailure', () => {
    it('should log authorization failure', async () => {
      await auditService.logAuthorizationFailure({
        user_id: testUser.id,
        username: testUser.username,
        action: 'PERMISSION_CHECK',
        resource_type: 'patients',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'GET',
        request_path: '/api/patients/123',
        reason: 'Missing permission: patients.read'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'PERMISSION_CHECK', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('FAILURE');
      expect(logs[0].severity).toBe('WARN');
      expect(logs[0].error_message).toBe('Missing permission: patients.read');
    });

    it('should use default action if not provided', async () => {
      await auditService.logAuthorizationFailure({
        username: 'testuser',
        resource_type: 'patients',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'GET',
        request_path: '/api/patients',
        reason: 'Access denied'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'AUTHORIZATION_FAILURE' }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].error_message).toBe('Access denied');
    });
  });

  describe('logCrudEvent', () => {
    it('should log CREATE with INFO severity', async () => {
      await auditService.logCrudEvent({
        user_id: testUser.id,
        username: testUser.username,
        action: 'CREATE',
        resource_type: 'patients',
        changes: { after: { name: 'John Doe' } },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'POST',
        request_path: '/api/patients'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'CREATE', resource_type: 'patients', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe('INFO');
      expect(logs[0].status).toBe('SUCCESS');
    });

    it('should log UPDATE with INFO severity', async () => {
      await auditService.logCrudEvent({
        user_id: testUser.id,
        username: testUser.username,
        action: 'UPDATE',
        resource_type: 'patients',
        changes: {
          before: { name: 'John' },
          after: { name: 'Jane' }
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'PUT',
        request_path: '/api/patients/123'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'UPDATE', resource_type: 'patients', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe('INFO');
    });

    it('should log DELETE with WARN severity', async () => {
      await auditService.logCrudEvent({
        user_id: testUser.id,
        username: testUser.username,
        action: 'DELETE',
        resource_type: 'patients',
        changes: { before: { name: 'John Doe' } },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'DELETE',
        request_path: '/api/patients/123'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'DELETE', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe('WARN');
    });

    it('should log READ with INFO severity', async () => {
      await auditService.logCrudEvent({
        user_id: testUser.id,
        username: testUser.username,
        action: 'READ',
        resource_type: 'patients',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'GET',
        request_path: '/api/patients/123'
      });

      const logs = await db.AuditLog.findAll({
        where: { action: 'READ', resource_type: 'patients', username: testUser.username }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe('INFO');
    });
  });

  describe('logDataAccess', () => {
    it('should log sensitive data access', async () => {
      await auditService.logDataAccess({
        user_id: testUser.id,
        username: testUser.username,
        resource_type: 'patients',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_path: '/api/patients/123'
      });

      const logs = await db.AuditLog.findAll({
        where: { resource_type: 'patients', username: testUser.username, action: 'READ' }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('READ');
      expect(logs[0].request_method).toBe('GET');
      expect(logs[0].severity).toBe('INFO');
      expect(logs[0].status).toBe('SUCCESS');
    });
  });

  describe('getAuditLogs', () => {
    let user;

    beforeEach(async () => {
      const role = await createRole({ name: 'VIEWER' });
      user = await createUser({ username: 'audituser', email: 'audituser@example.com', role });

      // Create various audit logs
      await auditService.logAuthEvent({
        user_id: user.id,
        username: user.username,
        action: 'LOGIN',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: 'SUCCESS'
      });

      await auditService.logCrudEvent({
        user_id: user.id,
        username: user.username,
        action: 'CREATE',
        resource_type: 'patients',
        resource_id: '123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'POST',
        request_path: '/api/patients'
      });

      await auditService.logAuthorizationFailure({
        user_id: user.id,
        username: user.username,
        resource_type: 'users',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'GET',
        request_path: '/api/users',
        reason: 'Missing permission'
      });
    });

    it('should get all audit logs', async () => {
      const result = await auditService.getAuditLogs();

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
    });

    it('should filter by user_id', async () => {
      const result = await auditService.getAuditLogs({ user_id: user.id });

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every(log => log.user_id === user.id)).toBe(true);
    });

    it('should filter by action', async () => {
      const result = await auditService.getAuditLogs({ action: 'LOGIN' });

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every(log => log.action === 'LOGIN')).toBe(true);
    });

    it('should filter by resource_type', async () => {
      const result = await auditService.getAuditLogs({ resource_type: 'patients' });

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every(log => log.resource_type === 'patients')).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await auditService.getAuditLogs({ status: 'FAILURE' });

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every(log => log.status === 'FAILURE')).toBe(true);
    });

    it('should filter by severity', async () => {
      const result = await auditService.getAuditLogs({ severity: 'WARN' });

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every(log => log.severity === 'WARN')).toBe(true);
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await auditService.getAuditLogs({
        from_date: yesterday,
        to_date: tomorrow
      });

      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const result = await auditService.getAuditLogs({ limit: 2, offset: 0 });

      expect(result.logs.length).toBeLessThanOrEqual(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });

    it('should sort by timestamp descending', async () => {
      const result = await auditService.getAuditLogs({ limit: 10 });

      if (result.logs.length > 1) {
        const timestamps = result.logs.map(log => new Date(log.timestamp).getTime());
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
        }
      }
    });

    it('should include user information', async () => {
      const result = await auditService.getAuditLogs({ user_id: user.id });

      const logsWithUser = result.logs.filter(log => log.user);
      expect(logsWithUser.length).toBeGreaterThan(0);

      if (logsWithUser.length > 0) {
        expect(logsWithUser[0].user.username).toBeDefined();
      }
    });
  });

  describe('getAuditStats', () => {
    let user;

    beforeEach(async () => {
      const role = await createRole({ name: 'DIETITIAN' });
      user = await createUser({ username: 'statsuser', email: 'statsuser@example.com', role });

      // Create various audit logs for stats
      await auditService.logAuthEvent({
        user_id: user.id,
        username: user.username,
        action: 'LOGIN',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: 'SUCCESS'
      });

      await auditService.logAuthEvent({
        user_id: user.id,
        username: user.username,
        action: 'LOGIN',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: 'SUCCESS'
      });

      await auditService.logCrudEvent({
        user_id: user.id,
        username: user.username,
        action: 'CREATE',
        resource_type: 'patients',
        resource_id: '123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'POST',
        request_path: '/api/patients'
      });

      await auditService.logAuthorizationFailure({
        user_id: user.id,
        username: user.username,
        resource_type: 'users',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        request_method: 'GET',
        request_path: '/api/users',
        reason: 'Missing permission'
      });
    });

    it('should return correct statistics', async () => {
      const stats = await auditService.getAuditStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.by_action).toBeDefined();
      expect(stats.by_status).toBeDefined();
      expect(stats.by_severity).toBeDefined();
      expect(stats.by_resource_type).toBeDefined();
    });

    it('should filter stats by user_id', async () => {
      const stats = await auditService.getAuditStats({ user_id: user.id });

      expect(stats.total).toBeGreaterThan(0);

      // Check that we have stats for the actions we created
      const loginStats = stats.by_action.find(a => a.action === 'LOGIN');
      expect(loginStats).toBeDefined();
      expect(parseInt(loginStats.count)).toBeGreaterThanOrEqual(2);
    });

    it('should filter stats by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = await auditService.getAuditStats({
        from_date: yesterday,
        to_date: tomorrow
      });

      expect(stats.total).toBeGreaterThan(0);
    });

    it('should group by action correctly', async () => {
      const stats = await auditService.getAuditStats({ user_id: user.id });

      expect(stats.by_action.length).toBeGreaterThan(0);

      const actions = stats.by_action.map(a => a.action);
      expect(actions).toContain('LOGIN');
      expect(actions).toContain('CREATE');
    });

    it('should group by status correctly', async () => {
      const stats = await auditService.getAuditStats({ user_id: user.id });

      expect(stats.by_status.length).toBeGreaterThan(0);

      const statuses = stats.by_status.map(s => s.status);
      expect(statuses).toContain('SUCCESS');
      expect(statuses).toContain('FAILURE');
    });

    it('should group by severity correctly', async () => {
      const stats = await auditService.getAuditStats({ user_id: user.id });

      expect(stats.by_severity.length).toBeGreaterThan(0);

      const severities = stats.by_severity.map(s => s.severity);
      expect(severities).toContain('INFO');
      expect(severities).toContain('WARN');
    });

    it('should group by resource_type correctly', async () => {
      const stats = await auditService.getAuditStats({ user_id: user.id });

      expect(stats.by_resource_type.length).toBeGreaterThan(0);

      const resourceTypes = stats.by_resource_type.map(r => r.resource_type);
      expect(resourceTypes).toContain('auth');
      expect(resourceTypes).toContain('patients');
    });
  });
});
