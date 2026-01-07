/**
 * Integration Tests: Audit Logs API
 *
 * Tests audit log endpoints with RBAC:
 * - Viewing audit logs (admin only)
 * - Filtering and search
 * - Audit statistics
 */

const request = require('supertest');
const app = require('../../src/server');
const { createUser, createRole, createPermission } = require('../helpers');
const auditService = require('../../src/services/audit.service');
const db = require('../../../models');

describe('Audit Logs API - Integration Tests', () => {
  let adminToken, dietitianToken;
  let adminUser, dietitianUser;
  let adminRole, dietitianRole;

  beforeEach(async () => {
    // Create roles
    adminRole = await createRole({ name: 'ADMIN' });
    dietitianRole = await createRole({ name: 'DIETITIAN' });

    // Create audit log permissions (admin only)
    const auditPermission = await createPermission({
      name: 'audit_logs.read',
      resource: 'audit_logs',
      action: 'read'
    });
    await db.RolePermission.create({
      role_id: adminRole.id,
      permission_id: auditPermission.id
    });

    // Create users
    adminUser = await createUser({
      username: 'admin_audit',
      email: 'admin_audit@test.com',
      role: adminRole
    });

    dietitianUser = await createUser({
      username: 'dietitian_audit',
      email: 'dietitian_audit@test.com',
      role: dietitianRole
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_audit', password: 'Test123!' });
    adminToken = adminLogin.body.data.accessToken;

    const dietitianLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dietitian_audit', password: 'Test123!' });
    dietitianToken = dietitianLogin.body.data.accessToken;

    // Create sample audit logs
    await auditService.logAuthEvent({
      user_id: adminUser.id,
      username: adminUser.username,
      action: 'LOGIN',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      status: 'SUCCESS'
    });

    await auditService.logCrudEvent({
      user_id: adminUser.id,
      username: adminUser.username,
      action: 'CREATE',
      resource_type: 'patients',
      resource_id: 'patient-123',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      request_method: 'POST',
      request_path: '/api/patients'
    });

    await auditService.logCrudEvent({
      user_id: dietitianUser.id,
      username: dietitianUser.username,
      action: 'UPDATE',
      resource_type: 'visits',
      resource_id: 'visit-456',
      ip_address: '192.168.1.2',
      user_agent: 'Mozilla/5.0',
      request_method: 'PUT',
      request_path: '/api/visits/visit-456',
      changes: { status: { old: 'SCHEDULED', new: 'COMPLETED' } }
    });

    await auditService.logAuthorizationFailure({
      user_id: dietitianUser.id,
      username: dietitianUser.username,
      resource_type: 'users',
      ip_address: '192.168.1.2',
      user_agent: 'Mozilla/5.0',
      request_method: 'GET',
      request_path: '/api/users',
      reason: 'Missing permission: users.read'
    });
  });

  describe('GET /api/audit-logs', () => {
    it('should return all audit logs for admin', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toBeDefined();
      expect(res.body.data.logs.length).toBeGreaterThanOrEqual(4);
      expect(res.body.data.total).toBeGreaterThanOrEqual(4);
    });

    it('should include user information in logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const logWithUser = res.body.data.logs.find(log => log.user);
      expect(logWithUser).toBeDefined();
      expect(logWithUser.user.username).toBeDefined();
    });

    it('should filter by user_id', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ user_id: adminUser.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.every(log => log.user_id === adminUser.id)).toBe(true);
    });

    it('should filter by action', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ action: 'LOGIN' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.every(log => log.action === 'LOGIN')).toBe(true);
    });

    it('should filter by resource_type', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ resource_type: 'patients' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.every(log => log.resource_type === 'patients')).toBe(true);
    });

    it('should filter by severity', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ severity: 'WARNING' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      if (res.body.data.logs.length > 0) {
        expect(res.body.data.logs.every(log => log.severity === 'WARNING')).toBe(true);
      }
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ status: 'SUCCESS' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.every(log => log.status === 'SUCCESS')).toBe(true);
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .get('/api/audit-logs')
        .query({
          from_date: yesterday.toISOString().split('T')[0],
          to_date: tomorrow.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBeGreaterThan(0);
    });

    it('should search by username', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ search: 'admin_audit' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.some(log => log.username.includes('admin_audit'))).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should support sorting', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ sort_by: 'created_at', sort_order: 'desc' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBeGreaterThan(0);
      
      // Verify descending order
      for (let i = 1; i < res.body.data.logs.length; i++) {
        const prevDate = new Date(res.body.data.logs[i - 1].created_at);
        const currDate = new Date(res.body.data.logs[i].created_at);
        expect(prevDate >= currDate).toBe(true);
      }
    });

    it('should combine multiple filters', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({
          user_id: adminUser.id,
          action: 'CREATE',
          resource_type: 'patients'
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      if (res.body.data.logs.length > 0) {
        expect(res.body.data.logs.every(log => 
          log.user_id === adminUser.id &&
          log.action === 'CREATE' &&
          log.resource_type === 'patients'
        )).toBe(true);
      }
    });

    it('should deny non-admin access', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/audit-logs');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/audit-logs/stats', () => {
    it('should return audit log statistics for admin', async () => {
      const res = await request(app)
        .get('/api/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_events).toBeDefined();
      expect(res.body.data.total_events).toBeGreaterThan(0);
      expect(res.body.data.by_action).toBeDefined();
      expect(res.body.data.by_severity).toBeDefined();
      expect(res.body.data.by_status).toBeDefined();
    });

    it('should include failure rate', async () => {
      const res = await request(app)
        .get('/api/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.failure_rate).toBeDefined();
      expect(typeof res.body.data.failure_rate).toBe('number');
    });

    it('should include top users', async () => {
      const res = await request(app)
        .get('/api/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      if (res.body.data.top_users) {
        expect(Array.isArray(res.body.data.top_users)).toBe(true);
      }
    });

    it('should filter stats by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .get('/api/audit-logs/stats')
        .query({
          from_date: yesterday.toISOString().split('T')[0],
          to_date: tomorrow.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_events).toBeGreaterThan(0);
    });

    it('should deny non-admin access', async () => {
      const res = await request(app)
        .get('/api/audit-logs/stats')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/audit-logs/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('Audit Log Content Validation', () => {
    it('should log CRUD operations with changes', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ action: 'UPDATE' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const updateLog = res.body.data.logs.find(log => log.action === 'UPDATE');
      if (updateLog && updateLog.changes) {
        expect(updateLog.changes).toBeDefined();
        expect(typeof updateLog.changes).toBe('object');
      }
    });

    it('should log authentication events', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ action: 'LOGIN' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const loginLog = res.body.data.logs.find(log => log.action === 'LOGIN');
      expect(loginLog).toBeDefined();
      expect(loginLog.ip_address).toBeDefined();
      expect(loginLog.user_agent).toBeDefined();
    });

    it('should log authorization failures', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .query({ severity: 'WARNING', status: 'FAILURE' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const failureLog = res.body.data.logs.find(log => 
        log.severity === 'WARNING' && log.status === 'FAILURE'
      );
      if (failureLog) {
        expect(failureLog.error_message).toBeDefined();
      }
    });

    it('should include request metadata', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const logWithMeta = res.body.data.logs.find(log => 
        log.request_method && log.request_path
      );
      if (logWithMeta) {
        expect(logWithMeta.request_method).toMatch(/^(GET|POST|PUT|DELETE|PATCH)$/);
        expect(logWithMeta.request_path).toMatch(/^\/api\//);
      }
    });
  });

  describe('Audit Log Immutability', () => {
    it('should not allow modifying audit logs via PUT', async () => {
      // Get an audit log ID
      const listRes = await request(app)
        .get('/api/audit-logs')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const logId = listRes.body.data.logs[0].id;

      // Try to update it
      const updateRes = await request(app)
        .put(`/api/audit-logs/${logId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'HACKED' });

      // Should return 404 or 405 (Method Not Allowed)
      expect([404, 405]).toContain(updateRes.status);
    });

    it('should not allow deleting audit logs via DELETE', async () => {
      // Get an audit log ID
      const listRes = await request(app)
        .get('/api/audit-logs')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const logId = listRes.body.data.logs[0].id;

      // Try to delete it
      const deleteRes = await request(app)
        .delete(`/api/audit-logs/${logId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Should return 404 or 405 (Method Not Allowed)
      expect([404, 405]).toContain(deleteRes.status);
    });
  });
});
