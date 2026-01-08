/**
 * Integration Tests: Users API
 *
 * Tests user management endpoints with RBAC:
 * - CRUD operations (admin only)
 * - User profile management (self-service)
 * - Password management
 * - Role management
 * - Activation/deactivation
 */

const request = require('supertest');
const app = require('../../src/server');
const { createUser, createRole, createPermission } = require('../helpers');
const db = require('../../models');

describe('Users API - Integration Tests', () => {
  let adminToken, dietitianToken, staffToken;
  let adminUser, dietitianUser, staffUser;
  let adminRole, dietitianRole, staffRole;

  beforeEach(async () => {
    // Create roles
    adminRole = await createRole({ name: 'ADMIN' });
    dietitianRole = await createRole({ name: 'DIETITIAN' });
    staffRole = await createRole({ name: 'STAFF' });

    // Create permissions
    const permissions = [
      { name: 'users.read', resource: 'users', action: 'read' },
      { name: 'users.update', resource: 'users', action: 'update' },
      { name: 'users.delete', resource: 'users', action: 'delete' }
    ];

    for (const permData of permissions) {
      const perm = await createPermission(permData);
      await db.RolePermission.create({ role_id: adminRole.id, permission_id: perm.id });
    }

    // Create users
    adminUser = await createUser({
      username: 'admin_user',
      email: 'admin_user@test.com',
      first_name: 'Admin',
      last_name: 'User',
      role: adminRole
    });

    dietitianUser = await createUser({
      username: 'dietitian_user',
      email: 'dietitian_user@test.com',
      first_name: 'Dietitian',
      last_name: 'User',
      role: dietitianRole
    });

    staffUser = await createUser({
      username: 'staff_user',
      email: 'staff_user@test.com',
      first_name: 'Staff',
      last_name: 'User',
      role: staffRole
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_user', password: 'Test123!' });
    adminToken = adminLogin.body.data.accessToken;

    const dietitianLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dietitian_user', password: 'Test123!' });
    dietitianToken = dietitianLogin.body.data.accessToken;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'staff_user', password: 'Test123!' });
    staffToken = staffLogin.body.data.accessToken;
  });

  describe('GET /api/users', () => {
    it('should return all users for admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('should exclude password hash from response', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.users.forEach(user => {
        expect(user.password_hash).toBeUndefined();
        expect(user.password).toBeUndefined();
      });
    });

    it('should filter by role_id', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ role_id: dietitianRole.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.every(u => u.role_id === dietitianRole.id)).toBe(true);
    });

    it('should filter by is_active', async () => {
      // Deactivate staff user
      staffUser.is_active = false;
      await staffUser.save();

      const res = await request(app)
        .get('/api/users')
        .query({ is_active: false })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.some(u => u.id === staffUser.id)).toBe(true);
    });

    it('should search by username', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ search: 'dietitian' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.some(u => u.username.includes('dietitian'))).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeLessThanOrEqual(2);
    });

    it('should deny non-admin access', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user details for admin', async () => {
      const res = await request(app)
        .get(`/api/users/${dietitianUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(dietitianUser.id);
      expect(res.body.data.username).toBe('dietitian_user');
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('should allow user to view own profile', async () => {
      const res = await request(app)
        .get(`/api/users/${dietitianUser.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(dietitianUser.id);
    });

    it('should deny user viewing other profiles', async () => {
      const res = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/users (via auth/register)', () => {
    // Note: User creation is typically done via /api/auth/register
    // which is already tested in auth.test.js
    // Testing direct user creation if admin-only endpoint exists

    it('should validate unique username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'admin_user', // Duplicate
          email: 'newadmin@test.com',
          password: 'SecurePass123!',
          first_name: 'New',
          last_name: 'Admin',
          role_id: adminRole.id
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('username');
    });

    it('should validate unique email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newadmin',
          email: 'admin_user@test.com', // Duplicate
          password: 'SecurePass123!',
          first_name: 'New',
          last_name: 'Admin',
          role_id: adminRole.id
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('email');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user profile as admin', async () => {
      const res = await request(app)
        .put(`/api/users/${dietitianUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'Updated',
          last_name: 'Name',
          phone: '555-1234'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.first_name).toBe('Updated');
      expect(res.body.data.last_name).toBe('Name');
      expect(res.body.data.phone).toBe('555-1234');
    });

    it('should allow user to update own profile', async () => {
      const res = await request(app)
        .put(`/api/users/${dietitianUser.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          first_name: 'Self',
          last_name: 'Updated',
          phone: '555-5678'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('Self');
    });

    it('should prevent user from updating own role', async () => {
      const res = await request(app)
        .put(`/api/users/${dietitianUser.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          role_id: adminRole.id // Try to become admin
        });

      // Should either ignore role change or return error
      expect(res.status).toBeGreaterThanOrEqual(200);
      
      // Verify role didn't change
      const user = await db.User.findByPk(dietitianUser.id);
      expect(user.role_id).toBe(dietitianRole.id);
    });

    it('should allow admin to change user role', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_id: dietitianRole.id
        });

      expect(res.status).toBe(200);
      expect(res.body.data.role_id).toBe(dietitianRole.id);
    });

    it('should validate unique username on update', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'admin_user' // Already taken
        });

      expect(res.status).toBe(400);
    });

    it('should validate unique email on update', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin_user@test.com' // Already taken
        });

      expect(res.status).toBe(400);
    });

    it('should deny user updating other users', async () => {
      const res = await request(app)
        .put(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          first_name: 'Hacked'
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'Test'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:id/password', () => {
    it('should allow user to change own password', async () => {
      const res = await request(app)
        .put(`/api/users/${dietitianUser.id}/password`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          current_password: 'Test123!',
          new_password: 'NewSecure123!',
          confirm_password: 'NewSecure123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dietitian_user',
          password: 'NewSecure123!'
        });

      expect(loginRes.status).toBe(200);
    });

    it('should reject with wrong current password', async () => {
      const res = await request(app)
        .put(`/api/users/${dietitianUser.id}/password`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          current_password: 'WrongPassword!',
          new_password: 'NewSecure123!',
          confirm_password: 'NewSecure123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('current password');
    });

    it('should reject if passwords do not match', async () => {
      const res = await request(app)
        .put(`/api/users/${dietitianUser.id}/password`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          current_password: 'Test123!',
          new_password: 'NewSecure123!',
          confirm_password: 'DifferentPassword!'
        });

      expect(res.status).toBe(400);
    });

    it('should validate password strength', async () => {
      const res = await request(app)
        .put(`/api/users/${dietitianUser.id}/password`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          current_password: 'Test123!',
          new_password: 'weak',
          confirm_password: 'weak'
        });

      expect(res.status).toBe(400);
    });

    it('should allow admin to reset user password without current password', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_password: 'AdminReset123!',
          confirm_password: 'AdminReset123!'
        });

      expect(res.status).toBe(200);
    });

    it('should deny user changing other user passwords', async () => {
      const res = await request(app)
        .put(`/api/users/${adminUser.id}/password`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          current_password: 'Test123!',
          new_password: 'Hacked123!',
          confirm_password: 'Hacked123!'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id/activate', () => {
    beforeEach(async () => {
      staffUser.is_active = false;
      await staffUser.save();
    });

    it('should activate user as admin', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_active).toBe(true);
    });

    it('should deny non-admin', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}/activate`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id/deactivate', () => {
    it('should deactivate user as admin', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_active).toBe(false);
    });

    it('should deny non-admin', async () => {
      const res = await request(app)
        .put(`/api/users/${staffUser.id}/deactivate`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should prevent deactivating self', async () => {
      const res = await request(app)
        .put(`/api/users/${adminUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot deactivate');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const res = await request(app)
        .delete(`/api/users/${staffUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user is deactivated
      const user = await db.User.findByPk(staffUser.id);
      expect(user.is_active).toBe(false);
    });

    it('should prevent deleting self', async () => {
      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot delete');
    });

    it('should deny non-admin', async () => {
      const res = await request(app)
        .delete(`/api/users/${staffUser.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should return user statistics for admin', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(3);
      expect(res.body.data.by_role).toBeDefined();
      expect(res.body.data.active_users).toBeDefined();
    });

    it('should deny non-admin', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(403);
    });
  });
});
