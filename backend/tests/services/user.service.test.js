/**
 * User Service Unit Tests
 */

const userService = require('../../src/services/user.service');
const db = require('../../models');
const { AppError } = require('../../src/middleware/errorHandler');
const { createRole, createUser } = require('../helpers');

describe('User Service', () => {
  describe('getUsers', () => {
    let adminRole, dietitianRole;
    let user1, user2, user3;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      user1 = await createUser({
        username: 'user1',
        email: 'user1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: adminRole
      });

      user2 = await createUser({
        username: 'user2',
        email: 'user2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: dietitianRole
      });

      user3 = await createUser({
        username: 'user3',
        email: 'user3@example.com',
        first_name: 'Bob',
        last_name: 'Johnson',
        is_active: false,
        role: adminRole
      });
    });

    it('should get all users', async () => {
      const result = await userService.getUsers();

      expect(result.users).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.users[0].password_hash).toBeUndefined();
    });

    it('should filter users by role', async () => {
      const result = await userService.getUsers({ role_id: adminRole.id });

      expect(result.users).toHaveLength(2);
      expect(result.users.every(u => u.role_id === adminRole.id)).toBe(true);
    });

    it('should filter users by active status', async () => {
      const result = await userService.getUsers({ is_active: true });

      expect(result.users).toHaveLength(2);
      expect(result.users.every(u => u.is_active === true)).toBe(true);
    });

    it('should search users by name', async () => {
      const result = await userService.getUsers({ search: 'John' });

      expect(result.users).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should search users by email', async () => {
      const result = await userService.getUsers({ search: 'user1@' });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe('user1@example.com');
    });

    it('should paginate results', async () => {
      const result = await userService.getUsers({ limit: 2, offset: 0 });

      expect(result.users).toHaveLength(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.total).toBe(3);
    });

    it('should sort users', async () => {
      const result = await userService.getUsers({
        sort_by: 'username',
        sort_order: 'ASC'
      });

      expect(result.users[0].username).toBe('user1');
      expect(result.users[1].username).toBe('user2');
      expect(result.users[2].username).toBe('user3');
    });
  });

  describe('getUserById', () => {
    let user, role;

    beforeEach(async () => {
      role = await createRole({ name: 'ADMIN' });
      user = await createUser({ username: 'testuser', role });
    });

    it('should get user by ID with role and permissions', async () => {
      const result = await userService.getUserById(user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.username).toBe('testuser');
      expect(result.password_hash).toBeUndefined();
      expect(result.role).toBeDefined();
      expect(result.role.name).toBe('ADMIN');
    });

    it('should throw error if user not found', async () => {
      await expect(userService.getUserById('nonexistent-id'))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    let user, admin, role;

    beforeEach(async () => {
      role = await createRole({ name: 'USER' });
      admin = await createUser({ username: 'admin', email: 'admin@example.com' });
      user = await createUser({
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role
      });
    });

    it('should update user successfully', async () => {
      const updates = {
        email: 'newemail@example.com',
        first_name: 'Updated',
        last_name: 'Name'
      };

      const result = await userService.updateUser(user.id, updates, admin.id);

      expect(result.email).toBe('newemail@example.com');
      expect(result.first_name).toBe('Updated');
      expect(result.last_name).toBe('Name');
    });

    it('should ignore non-allowed fields', async () => {
      const updates = {
        email: 'new@example.com',
        password_hash: 'hacked', // Should be ignored
        is_active: false // Should be ignored
      };

      const result = await userService.updateUser(user.id, updates, admin.id);

      expect(result.email).toBe('new@example.com');
      expect(result.is_active).toBe(true); // Should remain true
    });

    it('should throw error if email already exists', async () => {
      await expect(
        userService.updateUser(user.id, { email: 'admin@example.com' }, admin.id)
      ).rejects.toThrow('Email already exists');
    });

    it('should throw error if user not found', async () => {
      await expect(
        userService.updateUser('nonexistent-id', { email: 'new@example.com' }, admin.id)
      ).rejects.toThrow('User not found');
    });

    it('should allow same email if not changing', async () => {
      const result = await userService.updateUser(
        user.id,
        { email: user.email, first_name: 'NewName' },
        admin.id
      );

      expect(result.first_name).toBe('NewName');
    });
  });

  describe('deleteUser', () => {
    let user, admin;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      admin = await createUser({ username: 'admin', email: 'admin@example.com', role });
      user = await createUser({
        username: 'testuser',
        email: 'test@example.com',
        role
      });
    });

    it('should soft delete user successfully', async () => {
      const result = await userService.deleteUser(user.id, admin.id);

      expect(result.message).toBe('User deactivated successfully');

      // Verify user is deactivated
      const deletedUser = await db.User.findByPk(user.id);
      expect(deletedUser.is_active).toBe(false);
    });

    it('should prevent self-deletion', async () => {
      await expect(userService.deleteUser(admin.id, admin.id))
        .rejects
        .toThrow('Cannot delete your own account');
    });

    it('should throw error if user not found', async () => {
      await expect(userService.deleteUser('nonexistent-id', admin.id))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    let user, admin;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        password: 'AdminPass123!',
        role
      });
      user = await createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'OldPass123!',
        role
      });
    });

    it('should change own password with valid current password', async () => {
      const result = await userService.changePassword(
        user.id,
        'OldPass123!',
        'NewPass123!',
        user.id
      );

      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw error if current password is incorrect when changing own password', async () => {
      await expect(
        userService.changePassword(user.id, 'WrongPass!', 'NewPass123!', user.id)
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should allow admin to change other user password without current password', async () => {
      const result = await userService.changePassword(
        user.id,
        null,
        'NewPass123!',
        admin.id
      );

      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw error if new password is weak', async () => {
      await expect(
        userService.changePassword(user.id, 'OldPass123!', 'weak', user.id)
      ).rejects.toThrow('Password does not meet requirements');
    });

    it('should throw error if user not found', async () => {
      await expect(
        userService.changePassword('nonexistent-id', 'OldPass123!', 'NewPass123!', admin.id)
      ).rejects.toThrow('User not found');
    });
  });

  describe('activateUser', () => {
    let user, admin, role;

    beforeEach(async () => {
      role = await createRole({ name: 'ADMIN' });
      admin = await createUser({ username: 'admin', email: 'admin@example.com', role });
      user = await createUser({
        username: 'testuser',
        email: 'testuser@example.com',
        is_active: false,
        role
      });
    });

    it('should activate inactive user successfully', async () => {
      const result = await userService.activateUser(user.id, admin.id);

      expect(result.message).toBe('User activated successfully');

      // Verify user is activated
      const activatedUser = await db.User.findByPk(user.id);
      expect(activatedUser.is_active).toBe(true);
      expect(activatedUser.failed_login_attempts).toBe(0);
      expect(activatedUser.locked_until).toBeNull();
    });

    it('should throw error if user is already active', async () => {
      await user.update({ is_active: true });

      await expect(userService.activateUser(user.id, admin.id))
        .rejects
        .toThrow('User is already active');
    });

    it('should throw error if user not found', async () => {
      await expect(userService.activateUser('nonexistent-id', admin.id))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('deactivateUser', () => {
    let user, admin, refreshToken, apiKey, role;

    beforeEach(async () => {
      role = await createRole({ name: 'ADMIN' });
      admin = await createUser({ username: 'admin1', email: 'admin1@example.com', role });
      user = await createUser({
        username: 'testuser1',
        email: 'testuser1@example.com',
        role
      });

      // Create refresh token
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      refreshToken = await db.RefreshToken.create({
        token_hash: tokenHash,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Create API key
      const key = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      apiKey = await db.ApiKey.create({
        key_hash: keyHash,
        key_prefix: key.substring(0, 8),
        user_id: user.id,
        name: 'Test Key',
        is_active: true,
        created_by: user.id
      });
    });

    it('should deactivate active user successfully', async () => {
      const result = await userService.deactivateUser(user.id, admin.id);

      expect(result.message).toContain('User deactivated successfully');

      // Verify user is deactivated
      const deactivatedUser = await db.User.findByPk(user.id);
      expect(deactivatedUser.is_active).toBe(false);
    });

    it('should revoke all refresh tokens when deactivating', async () => {
      await userService.deactivateUser(user.id, admin.id);

      // Verify refresh token is revoked
      await refreshToken.reload();
      expect(refreshToken.revoked_at).toBeDefined();
    });

    it('should revoke all API keys when deactivating', async () => {
      await userService.deactivateUser(user.id, admin.id);

      // Verify API key is revoked
      await apiKey.reload();
      expect(apiKey.is_active).toBe(false);
    });

    it('should prevent self-deactivation', async () => {
      await expect(userService.deactivateUser(admin.id, admin.id))
        .rejects
        .toThrow('Cannot deactivate your own account');
    });

    it('should throw error if user is already inactive', async () => {
      await user.update({ is_active: false });

      await expect(userService.deactivateUser(user.id, admin.id))
        .rejects
        .toThrow('User is already inactive');
    });

    it('should throw error if user not found', async () => {
      await expect(userService.deactivateUser('nonexistent-id', admin.id))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('getUserStats', () => {
    beforeEach(async () => {
      const adminRole = await createRole({ name: 'ADMIN' });
      const dietitianRole = await createRole({ name: 'DIETITIAN' });

      await createUser({ username: 'admin_stats1', email: 'admin_stats1@example.com', role: adminRole });
      await createUser({ username: 'admin_stats2', email: 'admin_stats2@example.com', role: adminRole, is_active: false });
      await createUser({ username: 'dietitian_stats1', email: 'dietitian_stats1@example.com', role: dietitianRole });
      await createUser({ username: 'dietitian_stats2', email: 'dietitian_stats2@example.com', role: dietitianRole });
    });

    it('should return correct user statistics', async () => {
      const stats = await userService.getUserStats();

      expect(stats.total).toBe(4);
      expect(stats.active).toBe(3);
      expect(stats.inactive).toBe(1);
      expect(stats.by_role).toHaveLength(2);

      const adminStats = stats.by_role.find(r => r.role === 'ADMIN');
      const dietitianStats = stats.by_role.find(r => r.role === 'DIETITIAN');

      expect(adminStats.count).toBe(2);
      expect(dietitianStats.count).toBe(2);
    });
  });
});
