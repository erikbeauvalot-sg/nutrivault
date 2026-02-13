/**
 * User Service Tests
 * Tests for user.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const bcrypt = require('bcryptjs');

let db;
let userService;

describe('User Service', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    userService = require('../../src/services/user.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();
  });

  // ========================================
  // getUsers
  // ========================================
  describe('getUsers', () => {
    let adminAuth, dietitianAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
      dietitianAuth = await testAuth.createDietitian();
    });

    it('should return paginated users list', async () => {
      const result = await userService.getUsers(adminAuth.user);

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages');
      expect(result.users.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by search term', async () => {
      const result = await userService.getUsers(adminAuth.user, {
        search: adminAuth.user.username
      });

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.users.some(u => u.username === adminAuth.user.username)).toBe(true);
    });

    it('should filter by role_id', async () => {
      const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
      const result = await userService.getUsers(adminAuth.user, {
        role_id: dietitianRole.id
      });

      result.users.forEach(u => {
        expect(u.role_id).toBe(dietitianRole.id);
      });
    });

    it('should filter active users by default', async () => {
      // Deactivate the dietitian
      await dietitianAuth.user.update({ is_active: false });

      const result = await userService.getUsers(adminAuth.user);

      // Should not include deactivated user
      expect(result.users.some(u => u.id === dietitianAuth.user.id)).toBe(false);
    });

    it('should filter by is_active=false', async () => {
      await dietitianAuth.user.update({ is_active: false });

      const result = await userService.getUsers(adminAuth.user, { is_active: 'false' });

      expect(result.users.length).toBeGreaterThanOrEqual(1);
      result.users.forEach(u => {
        expect(u.is_active).toBe(false);
      });
    });

    it('should filter active users with is_active string true', async () => {
      await dietitianAuth.user.update({ is_active: false });

      const result = await userService.getUsers(adminAuth.user, { is_active: 'true' });

      result.users.forEach(u => {
        expect(u.is_active).toBe(true);
      });
      expect(result.users.some(u => u.id === dietitianAuth.user.id)).toBe(false);
    });

    it('should handle boolean is_active filter', async () => {
      await dietitianAuth.user.update({ is_active: false });

      const result = await userService.getUsers(adminAuth.user, { is_active: true });

      result.users.forEach(u => {
        expect(u.is_active).toBe(true);
      });
    });

    it('should show all users when is_active is empty string', async () => {
      await dietitianAuth.user.update({ is_active: false });

      const result = await userService.getUsers(adminAuth.user, { is_active: '' });

      // Should include both active and inactive
      expect(result.users.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply pagination', async () => {
      const result = await userService.getUsers(adminAuth.user, { page: 1, limit: 1 });

      expect(result.users.length).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should exclude password_hash from response', async () => {
      const result = await userService.getUsers(adminAuth.user);

      result.users.forEach(u => {
        expect(u.password_hash).toBeUndefined();
      });
    });

    it('should include role with permissions', async () => {
      const result = await userService.getUsers(adminAuth.user);

      result.users.forEach(u => {
        expect(u.role).toBeDefined();
        expect(u.role.name).toBeDefined();
      });
    });
  });

  // ========================================
  // getUserById
  // ========================================
  describe('getUserById', () => {
    let adminAuth, dietitianAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
      dietitianAuth = await testAuth.createDietitian();
    });

    it('should return user by ID for admin', async () => {
      const result = await userService.getUserById(adminAuth.user, dietitianAuth.user.id);

      expect(result.id).toBe(dietitianAuth.user.id);
      expect(result.username).toBe(dietitianAuth.user.username);
      expect(result.password_hash).toBeUndefined();
    });

    it('should allow user to view own profile', async () => {
      const result = await userService.getUserById(dietitianAuth.user, dietitianAuth.user.id);

      expect(result.id).toBe(dietitianAuth.user.id);
    });

    it('should throw 404 for non-existent user', async () => {
      await expect(
        userService.getUserById(adminAuth.user, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });

    it('should deny non-admin viewing other user without permission', async () => {
      // Create assistant with no users.read permission
      const assistantAuth = await testAuth.createAssistant();

      await expect(
        userService.getUserById(assistantAuth.user, adminAuth.user.id)
      ).rejects.toThrow('Access denied');
    });

    it('should include role and permissions in response', async () => {
      const result = await userService.getUserById(adminAuth.user, dietitianAuth.user.id);

      expect(result.role).toBeDefined();
      expect(result.role.name).toBe('DIETITIAN');
    });
  });

  // ========================================
  // createUser
  // ========================================
  describe('createUser', () => {
    let adminAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
    });

    it('should create a new user', async () => {
      const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
      const userData = {
        username: 'newdietitian',
        email: 'new.dietitian@test.com',
        password: 'SecurePass123!',
        role_id: dietitianRole.id,
        first_name: 'New',
        last_name: 'Dietitian'
      };

      const result = await userService.createUser(adminAuth.user, userData);

      expect(result.username).toBe('newdietitian');
      expect(result.email).toBe('new.dietitian@test.com');
      expect(result.role.name).toBe('DIETITIAN');
      expect(result.password_hash).toBeUndefined();
    });

    it('should hash the password', async () => {
      const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
      const userData = {
        username: 'hashtest',
        email: 'hash@test.com',
        password: 'SecurePass123!',
        role_id: dietitianRole.id,
        first_name: 'Hash',
        last_name: 'Test'
      };

      const result = await userService.createUser(adminAuth.user, userData);
      const dbUser = await db.User.findByPk(result.id);

      expect(dbUser.password_hash).not.toBe('SecurePass123!');
      const isValid = await bcrypt.compare('SecurePass123!', dbUser.password_hash);
      expect(isValid).toBe(true);
    });

    it('should reject duplicate username', async () => {
      const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
      const userData = {
        username: adminAuth.user.username,
        email: 'unique@test.com',
        password: 'SecurePass123!',
        role_id: dietitianRole.id,
        first_name: 'Dup',
        last_name: 'User'
      };

      await expect(
        userService.createUser(adminAuth.user, userData)
      ).rejects.toThrow('Username already exists');
    });

    it('should reject duplicate email', async () => {
      const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
      const userData = {
        username: 'uniqueuser',
        email: adminAuth.user.email,
        password: 'SecurePass123!',
        role_id: dietitianRole.id,
        first_name: 'Dup',
        last_name: 'Email'
      };

      await expect(
        userService.createUser(adminAuth.user, userData)
      ).rejects.toThrow('Email already exists');
    });

    it('should reject invalid role', async () => {
      const userData = {
        username: 'invalidrole',
        email: 'invalid.role@test.com',
        password: 'SecurePass123!',
        role_id: '00000000-0000-0000-0000-000000000000',
        first_name: 'Invalid',
        last_name: 'Role'
      };

      await expect(
        userService.createUser(adminAuth.user, userData)
      ).rejects.toThrow('Role not found');
    });

    it('should set default language_preference to fr', async () => {
      const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
      const userData = {
        username: 'langtest',
        email: 'lang@test.com',
        password: 'SecurePass123!',
        role_id: dietitianRole.id,
        first_name: 'Lang',
        last_name: 'Test'
      };

      const result = await userService.createUser(adminAuth.user, userData);
      const dbUser = await db.User.findByPk(result.id);
      expect(dbUser.language_preference).toBe('fr');
    });
  });

  // ========================================
  // updateUser
  // ========================================
  describe('updateUser', () => {
    let adminAuth, dietitianAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
      dietitianAuth = await testAuth.createDietitian();
    });

    it('should allow admin to update any user', async () => {
      const result = await userService.updateUser(
        adminAuth.user,
        dietitianAuth.user.id,
        { first_name: 'Updated', last_name: 'Name' }
      );

      expect(result.first_name).toBe('Updated');
      expect(result.last_name).toBe('Name');
    });

    it('should allow user to update own profile', async () => {
      const result = await userService.updateUser(
        dietitianAuth.user,
        dietitianAuth.user.id,
        { first_name: 'SelfUpdated' }
      );

      expect(result.first_name).toBe('SelfUpdated');
    });

    it('should deny non-admin updating other user profile', async () => {
      await expect(
        userService.updateUser(
          dietitianAuth.user,
          adminAuth.user.id,
          { first_name: 'Hacked' }
        )
      ).rejects.toThrow('Access denied');
    });

    it('should throw 404 for non-existent user', async () => {
      await expect(
        userService.updateUser(
          adminAuth.user,
          '00000000-0000-0000-0000-000000000000',
          { first_name: 'Ghost' }
        )
      ).rejects.toThrow('User not found');
    });

    it('should reject duplicate email on update', async () => {
      await expect(
        userService.updateUser(
          adminAuth.user,
          dietitianAuth.user.id,
          { email: adminAuth.user.email }
        )
      ).rejects.toThrow('Email already exists');
    });

    it('should reject duplicate username on update', async () => {
      await expect(
        userService.updateUser(
          adminAuth.user,
          dietitianAuth.user.id,
          { username: adminAuth.user.username }
        )
      ).rejects.toThrow('Username already exists');
    });

    it('should validate role on update', async () => {
      await expect(
        userService.updateUser(
          adminAuth.user,
          dietitianAuth.user.id,
          { role_id: '00000000-0000-0000-0000-000000000000' }
        )
      ).rejects.toThrow('Role not found');
    });

    it('should admin be able to update role_id', async () => {
      const assistantRole = await db.Role.findOne({ where: { name: 'ASSISTANT' } });
      const result = await userService.updateUser(
        adminAuth.user,
        dietitianAuth.user.id,
        { role_id: assistantRole.id }
      );

      expect(result.role.name).toBe('ASSISTANT');
    });

    it('should not allow regular user to change role', async () => {
      const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
      // Non-admin updating own profile - role_id not in allowedFields
      const result = await userService.updateUser(
        dietitianAuth.user,
        dietitianAuth.user.id,
        { role_id: adminRole.id, first_name: 'Updated' }
      );

      // Role should not have changed
      expect(result.role.name).toBe('DIETITIAN');
      expect(result.first_name).toBe('Updated');
    });
  });

  // ========================================
  // deleteUser
  // ========================================
  describe('deleteUser', () => {
    let adminAuth, dietitianAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
      dietitianAuth = await testAuth.createDietitian();
    });

    it('should delete a deactivated user', async () => {
      // First deactivate
      await dietitianAuth.user.update({ is_active: false });

      const result = await userService.deleteUser(adminAuth.user, dietitianAuth.user.id);

      expect(result.message).toContain('deleted');

      // Verify hard delete
      const deleted = await db.User.findByPk(dietitianAuth.user.id);
      expect(deleted).toBeNull();
    });

    it('should throw 404 for non-existent user', async () => {
      await expect(
        userService.deleteUser(adminAuth.user, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });

    it('should prevent deleting own account', async () => {
      await expect(
        userService.deleteUser(adminAuth.user, adminAuth.user.id)
      ).rejects.toThrow('Cannot delete your own account');
    });

    it('should require deactivation before deletion', async () => {
      // dietitian is still active
      await expect(
        userService.deleteUser(adminAuth.user, dietitianAuth.user.id)
      ).rejects.toThrow('User must be deactivated before deletion');
    });
  });

  // ========================================
  // changePassword
  // ========================================
  describe('changePassword', () => {
    let adminAuth, dietitianAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
      dietitianAuth = await testAuth.createDietitian();
    });

    it('should allow admin to reset any password without old password', async () => {
      await userService.changePassword(
        adminAuth.user,
        dietitianAuth.user.id,
        null,
        'NewPassword456!'
      );

      const dbUser = await db.User.findByPk(dietitianAuth.user.id);
      const isValid = await bcrypt.compare('NewPassword456!', dbUser.password_hash);
      expect(isValid).toBe(true);
    });

    it('should allow user to change own password with correct old password', async () => {
      await userService.changePassword(
        dietitianAuth.user,
        dietitianAuth.user.id,
        dietitianAuth.password,
        'NewPassword456!'
      );

      const dbUser = await db.User.findByPk(dietitianAuth.user.id);
      const isValid = await bcrypt.compare('NewPassword456!', dbUser.password_hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong old password', async () => {
      await expect(
        userService.changePassword(
          dietitianAuth.user,
          dietitianAuth.user.id,
          'WrongOldPassword!',
          'NewPassword456!'
        )
      ).rejects.toThrow('Old password is incorrect');
    });

    it('should require old password for non-admin', async () => {
      await expect(
        userService.changePassword(
          dietitianAuth.user,
          dietitianAuth.user.id,
          null,
          'NewPassword456!'
        )
      ).rejects.toThrow('Old password is required');
    });

    it('should deny non-admin changing other user password', async () => {
      await expect(
        userService.changePassword(
          dietitianAuth.user,
          adminAuth.user.id,
          null,
          'HackedPassword!'
        )
      ).rejects.toThrow('Access denied');
    });

    it('should throw 404 for non-existent user', async () => {
      await expect(
        userService.changePassword(
          adminAuth.user,
          '00000000-0000-0000-0000-000000000000',
          null,
          'NewPassword456!'
        )
      ).rejects.toThrow('User not found');
    });

    it('should reset failed login attempts on password change', async () => {
      const targetUser = await db.User.findByPk(dietitianAuth.user.id);
      await targetUser.update({ failed_login_attempts: 5 });

      await userService.changePassword(
        adminAuth.user,
        dietitianAuth.user.id,
        null,
        'NewPassword456!'
      );

      const updated = await db.User.findByPk(dietitianAuth.user.id);
      expect(updated.failed_login_attempts).toBe(0);
      expect(updated.locked_until).toBeNull();
    });
  });

  // ========================================
  // toggleUserStatus
  // ========================================
  describe('toggleUserStatus', () => {
    let adminAuth, dietitianAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
      dietitianAuth = await testAuth.createDietitian();
    });

    it('should deactivate an active user', async () => {
      const result = await userService.toggleUserStatus(adminAuth.user, dietitianAuth.user.id);

      expect(result.is_active).toBe(false);
    });

    it('should activate an inactive user', async () => {
      await dietitianAuth.user.update({ is_active: false });

      const result = await userService.toggleUserStatus(adminAuth.user, dietitianAuth.user.id);

      expect(result.is_active).toBe(true);
    });

    it('should prevent toggling own status', async () => {
      await expect(
        userService.toggleUserStatus(adminAuth.user, adminAuth.user.id)
      ).rejects.toThrow('Cannot toggle your own account status');
    });

    it('should throw 404 for non-existent user', async () => {
      await expect(
        userService.toggleUserStatus(adminAuth.user, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });

    it('should return user with role info', async () => {
      const result = await userService.toggleUserStatus(adminAuth.user, dietitianAuth.user.id);

      expect(result.role).toBeDefined();
      expect(result.role.name).toBe('DIETITIAN');
    });
  });

  // ========================================
  // getDietitians
  // ========================================
  describe('getDietitians', () => {
    beforeEach(async () => {
      await testAuth.createAdmin();
      await testAuth.createDietitian();
    });

    it('should return only users with DIETITIAN role', async () => {
      const result = await userService.getDietitians();

      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach(u => {
        expect(u.role.name).toBe('DIETITIAN');
      });
    });

    it('should not return admin users', async () => {
      const result = await userService.getDietitians();

      result.forEach(u => {
        expect(u.role.name).not.toBe('ADMIN');
      });
    });

    it('should not return inactive dietitians', async () => {
      const inactiveDiet = await testAuth.createDietitian({ is_active: false });

      const result = await userService.getDietitians();

      expect(result.some(u => u.id === inactiveDiet.user.id)).toBe(false);
    });

    it('should exclude password_hash', async () => {
      const result = await userService.getDietitians();

      result.forEach(u => {
        expect(u.password_hash).toBeUndefined();
      });
    });
  });

  // ========================================
  // getRoles
  // ========================================
  describe('getRoles', () => {
    it('should return all active roles', async () => {
      const result = await userService.getRoles();

      expect(result.length).toBeGreaterThanOrEqual(3);
      const roleNames = result.map(r => r.name);
      expect(roleNames).toContain('ADMIN');
      expect(roleNames).toContain('DIETITIAN');
      expect(roleNames).toContain('ASSISTANT');
    });

    it('should not return inactive roles', async () => {
      // Deactivate one role
      const patientRole = await db.Role.findOne({ where: { name: 'PATIENT' } });
      await patientRole.update({ is_active: false });

      const result = await userService.getRoles();

      expect(result.some(r => r.name === 'PATIENT')).toBe(false);
    });
  });

  // ========================================
  // checkEmailAvailability
  // ========================================
  describe('checkEmailAvailability', () => {
    let adminAuth;

    beforeEach(async () => {
      adminAuth = await testAuth.createAdmin();
    });

    it('should return true for available email', async () => {
      const result = await userService.checkEmailAvailability('brand.new@test.com');
      expect(result).toBe(true);
    });

    it('should return false for taken email', async () => {
      const result = await userService.checkEmailAvailability(adminAuth.user.email);
      expect(result).toBe(false);
    });

    it('should return true when excluding own ID', async () => {
      const result = await userService.checkEmailAvailability(
        adminAuth.user.email,
        adminAuth.user.id
      );
      expect(result).toBe(true);
    });

    it('should return false for empty email', async () => {
      const result = await userService.checkEmailAvailability('');
      expect(result).toBe(false);
    });

    it('should return false for null email', async () => {
      const result = await userService.checkEmailAvailability(null);
      expect(result).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      const result = await userService.checkEmailAvailability(
        adminAuth.user.email.toUpperCase()
      );
      expect(result).toBe(false);
    });
  });
});
