/**
 * Messages API Integration Tests
 * Tests for /api/messages REST endpoints
 *
 * Routes use `authenticate` + `requirePermission('messages.*')`.
 * ADMIN sees all conversations; DIETITIAN sees own; ASSISTANT has messages.read only.
 * Conversation and Message are paranoid (soft delete), so cleanup uses force:true.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;
let db;

describe('Messages API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testPatient;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    app = require('../setup/testServer').resetApp();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();

    // Create a patient for use in conversation tests
    testPatient = await db.Patient.create({
      first_name: 'Alice',
      last_name: 'Dupont',
      email: 'alice.dupont@example.com',
      is_active: true,
      language_preference: 'fr',
    });

    // Link patient to dietitian via PatientDietitian M2M table
    await db.PatientDietitian.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id,
    });
  });

  // ========================================
  // GET /api/messages/conversations
  // ========================================
  describe('GET /api/messages/conversations', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).get('/api/messages/conversations');
      expect(response.status).toBe(401);
    });

    it('returns 200 with empty list when no conversations exist (admin)', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('returns 200 with empty list when no conversations exist (dietitian)', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('assistant with messages.read can list conversations', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', assistantAuth.authHeader);

      // Assistant has messages.read permission; route requires messages.read
      expect(response.status).toBe(200);
    });

    it('returns conversations for dietitian (only their own)', async () => {
      // Dietitian's own conversation
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        title: 'Dietitian convo',
      });

      // Another dietitian's conversation
      const otherDietitian = await testAuth.createDietitian();
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        title: 'Other dietitian convo',
      });

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Dietitian convo');
    });

    it('admin sees all conversations', async () => {
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        title: 'Convo 1',
      });

      const otherDietitian = await testAuth.createDietitian();
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        title: 'Convo 2',
      });

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('filters conversations by status=open', async () => {
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
        title: 'Open convo',
      });
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'closed',
        title: 'Closed convo',
      });

      const response = await request(app)
        .get('/api/messages/conversations?status=open')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('open');
    });

    it('filters conversations by status=closed', async () => {
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
        title: 'Open convo',
      });
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'closed',
        title: 'Closed convo',
      });

      const response = await request(app)
        .get('/api/messages/conversations?status=closed')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('closed');
    });

    it('includes patient and dietitian associations', async () => {
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
      });

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data[0].patient).toBeDefined();
      expect(response.body.data[0].patient.first_name).toBe('Alice');
      expect(response.body.data[0].dietitian).toBeDefined();
    });
  });

  // ========================================
  // POST /api/messages/conversations
  // ========================================
  describe('POST /api/messages/conversations', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/messages/conversations')
        .send({ patient_id: testPatient.id });

      expect(response.status).toBe(401);
    });

    it('returns 403 for assistant (no messages.create)', async () => {
      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', assistantAuth.authHeader)
        .send({ patient_id: testPatient.id });

      expect(response.status).toBe(403);
    });

    it('creates a conversation as dietitian and returns 201', async () => {
      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ patient_id: testPatient.id });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.patient_id).toBe(testPatient.id);
      expect(response.body.data.dietitian_id).toBe(dietitianAuth.user.id);
      expect(response.body.data.status).toBe('open');
    });

    it('creates a conversation as admin and returns 201', async () => {
      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', adminAuth.authHeader)
        .send({ patient_id: testPatient.id });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('returns 404 for non-existent patient_id', async () => {
      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ patient_id: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for invalid (non-UUID) patient_id', async () => {
      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ patient_id: 'not-a-uuid' });

      // express-validator returns 400 for invalid UUID
      expect(response.status).toBe(400);
    });

    it('includes patient and dietitian in response', async () => {
      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ patient_id: testPatient.id });

      expect(response.status).toBe(201);
      expect(response.body.data.patient).toBeDefined();
      expect(response.body.data.patient.id).toBe(testPatient.id);
      expect(response.body.data.dietitian).toBeDefined();
    });
  });

  // ========================================
  // GET /api/messages/conversations/:id/messages
  // ========================================
  describe('GET /api/messages/conversations/:id/messages', () => {
    let conversation;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).get(
        `/api/messages/conversations/${conversation.id}/messages`
      );
      expect(response.status).toBe(401);
    });

    it('returns 200 with empty messages list', async () => {
      const response = await request(app)
        .get(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('returns messages for the conversation', async () => {
      await db.Message.create({
        conversation_id: conversation.id,
        sender_id: dietitianAuth.user.id,
        content: 'Hello patient!',
      });

      const response = await request(app)
        .get(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toBe('Hello patient!');
    });

    it('returns 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/messages/conversations/00000000-0000-0000-0000-000000000000/messages')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(404);
    });

    it('returns 403 when dietitian tries to access another dietitian s conversation', async () => {
      const otherDietitian = await testAuth.createDietitian();
      const otherConvo = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        status: 'open',
      });

      const response = await request(app)
        .get(`/api/messages/conversations/${otherConvo.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(403);
    });

    it('admin can access any conversation s messages', async () => {
      const response = await request(app)
        .get(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
    });

    it('includes sender information on messages', async () => {
      await db.Message.create({
        conversation_id: conversation.id,
        sender_id: dietitianAuth.user.id,
        content: 'Test message',
      });

      const response = await request(app)
        .get(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data[0].sender).toBeDefined();
      expect(response.body.data[0].sender.id).toBe(dietitianAuth.user.id);
    });

    it('resets dietitian_unread_count to 0 after reading', async () => {
      await conversation.update({ dietitian_unread_count: 3 });

      await request(app)
        .get(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader);

      await conversation.reload();
      expect(conversation.dietitian_unread_count).toBe(0);
    });
  });

  // ========================================
  // POST /api/messages/conversations/:id/messages
  // ========================================
  describe('POST /api/messages/conversations/:id/messages', () => {
    let conversation;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .send({ content: 'Hello' });

      expect(response.status).toBe(401);
    });

    it('returns 403 for assistant (no messages.create)', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ content: 'Hello' });

      expect(response.status).toBe(403);
    });

    it('sends a message and returns 201', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Hello patient!' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello patient!');
      expect(response.body.data.sender_id).toBe(dietitianAuth.user.id);
    });

    it('returns 400 when content is missing', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({});

      expect(response.status).toBe(400);
    });

    it('returns 400 when content is empty string', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent conversation', async () => {
      const response = await request(app)
        .post('/api/messages/conversations/00000000-0000-0000-0000-000000000000/messages')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Hello' });

      expect(response.status).toBe(404);
    });

    it('returns 403 when dietitian tries to post in another dietitian s conversation', async () => {
      const otherDietitian = await testAuth.createDietitian();
      const otherConvo = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        status: 'open',
      });

      const response = await request(app)
        .post(`/api/messages/conversations/${otherConvo.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Unauthorized message' });

      expect(response.status).toBe(403);
    });

    it('updates conversation last_message_at and patient_unread_count', async () => {
      await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Update metadata' });

      await conversation.reload();
      expect(conversation.last_message_at).not.toBeNull();
      expect(conversation.last_message_preview).toBe('Update metadata');
      expect(conversation.patient_unread_count).toBe(1);
    });

    it('auto-reopens a closed conversation when a message is sent', async () => {
      await conversation.update({
        status: 'closed',
        closed_at: new Date(),
        closed_by: dietitianAuth.user.id,
      });

      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Reopening conversation' });

      expect(response.status).toBe(201);

      await conversation.reload();
      expect(conversation.status).toBe('open');
      expect(conversation.closed_at).toBeNull();
    });

    it('includes sender information in the response', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/messages`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'With sender info' });

      expect(response.status).toBe(201);
      expect(response.body.data.sender).toBeDefined();
      expect(response.body.data.sender.id).toBe(dietitianAuth.user.id);
    });
  });

  // ========================================
  // PUT /api/messages/conversations/:id
  // ========================================
  describe('PUT /api/messages/conversations/:id', () => {
    let conversation;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
        title: 'Original Title',
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}`)
        .send({ title: 'New Title' });

      expect(response.status).toBe(401);
    });

    it('returns 403 for assistant (no messages.update)', async () => {
      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ title: 'New Title' });

      expect(response.status).toBe(403);
    });

    it('updates conversation title and returns 200', async () => {
      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('closes a conversation by updating status to closed', async () => {
      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ status: 'closed' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('closed');

      await conversation.reload();
      expect(conversation.status).toBe('closed');
      expect(conversation.closed_at).not.toBeNull();
      expect(conversation.closed_by).toBe(dietitianAuth.user.id);
    });

    it('reopens a conversation by updating status to open', async () => {
      await conversation.update({
        status: 'closed',
        closed_at: new Date(),
        closed_by: dietitianAuth.user.id,
      });

      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ status: 'open' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('open');

      await conversation.reload();
      expect(conversation.closed_at).toBeNull();
      expect(conversation.closed_by).toBeNull();
    });

    it('returns 404 for non-existent conversation', async () => {
      const response = await request(app)
        .put('/api/messages/conversations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
    });

    it('returns 403 when dietitian tries to update another dietitian s conversation', async () => {
      const otherDietitian = await testAuth.createDietitian();
      const otherConvo = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        status: 'open',
      });

      const response = await request(app)
        .put(`/api/messages/conversations/${otherConvo.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ title: 'Unauthorized update' });

      expect(response.status).toBe(403);
    });

    it('admin can update any conversation', async () => {
      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ title: 'Admin Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Admin Updated');
    });
  });

  // ========================================
  // DELETE /api/messages/conversations/:id
  // ========================================
  describe('DELETE /api/messages/conversations/:id', () => {
    let conversation;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'closed',
        closed_at: new Date(),
        closed_by: dietitianAuth.user.id,
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).delete(
        `/api/messages/conversations/${conversation.id}`
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 for assistant (no messages.delete)', async () => {
      const response = await request(app)
        .delete(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(response.status).toBe(403);
    });

    it('deletes a closed conversation and returns 200', async () => {
      const response = await request(app)
        .delete(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const found = await db.Conversation.findByPk(conversation.id, { paranoid: false });
      expect(found.deleted_at).not.toBeNull();
    });

    it('returns 400 when trying to delete an open conversation', async () => {
      const openConvo = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });

      const response = await request(app)
        .delete(`/api/messages/conversations/${openConvo.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 for non-existent conversation', async () => {
      const response = await request(app)
        .delete('/api/messages/conversations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(404);
    });

    it('returns 403 when dietitian tries to delete another dietitian s conversation', async () => {
      const otherDietitian = await testAuth.createDietitian();
      const otherConvo = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        status: 'closed',
        closed_at: new Date(),
        closed_by: otherDietitian.user.id,
      });

      const response = await request(app)
        .delete(`/api/messages/conversations/${otherConvo.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(403);
    });

    it('admin can delete any closed conversation', async () => {
      const response = await request(app)
        .delete(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
    });
  });

  // ========================================
  // GET /api/messages/unread-count
  // ========================================
  describe('GET /api/messages/unread-count', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).get('/api/messages/unread-count');
      expect(response.status).toBe(401);
    });

    it('returns 200 with unread_count of 0 when no conversations exist', async () => {
      const response = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.unread_count).toBe(0);
    });

    it('returns total unread count across all conversations for dietitian', async () => {
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
        dietitian_unread_count: 3,
      });
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
        dietitian_unread_count: 2,
      });

      const response = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.unread_count).toBe(5);
    });

    it('does not include other dietitians conversations in count', async () => {
      const otherDietitian = await testAuth.createDietitian();
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        status: 'open',
        dietitian_unread_count: 10,
      });

      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
        dietitian_unread_count: 1,
      });

      const response = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.unread_count).toBe(1);
    });

    it('admin sees total unread count across all conversations', async () => {
      const otherDietitian = await testAuth.createDietitian();
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
        dietitian_unread_count: 3,
      });
      await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: otherDietitian.user.id,
        status: 'open',
        dietitian_unread_count: 5,
      });

      const response = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.unread_count).toBe(8);
    });
  });

  // ========================================
  // GET /api/messages/labels
  // ========================================
  describe('GET /api/messages/labels', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).get('/api/messages/labels');
      expect(response.status).toBe(401);
    });

    it('returns 200 with empty array when no labels exist', async () => {
      const response = await request(app)
        .get('/api/messages/labels')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('returns distinct labels created by the current user', async () => {
      const conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
      });

      await db.ConversationLabel.create({
        conversation_id: conversation.id,
        label: 'urgent',
        color: '#ff0000',
        created_by: dietitianAuth.user.id,
      });
      await db.ConversationLabel.create({
        conversation_id: conversation.id,
        label: 'follow-up',
        color: '#00ff00',
        created_by: dietitianAuth.user.id,
      });

      const response = await request(app)
        .get('/api/messages/labels')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data).toContain('urgent');
      expect(response.body.data).toContain('follow-up');
    });

    it('returns only labels for the current user (not other users)', async () => {
      const adminConvo = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: adminAuth.user.id,
      });

      await db.ConversationLabel.create({
        conversation_id: adminConvo.id,
        label: 'admin-label',
        created_by: adminAuth.user.id,
      });

      const response = await request(app)
        .get('/api/messages/labels')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).not.toContain('admin-label');
    });
  });

  // ========================================
  // POST /api/messages/conversations/:id/labels
  // ========================================
  describe('POST /api/messages/conversations/:id/labels', () => {
    let conversation;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/labels`)
        .send({ label: 'urgent' });

      expect(response.status).toBe(401);
    });

    it('returns 403 for assistant (no messages.update)', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/labels`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ label: 'urgent' });

      expect(response.status).toBe(403);
    });

    it('adds a label to a conversation and returns 201', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/labels`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'urgent', color: '#ff0000' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.label).toBe('urgent');
      expect(response.body.data.color).toBe('#ff0000');
    });

    it('adds a label without a color', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/labels`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'no-color' });

      expect(response.status).toBe(201);
      expect(response.body.data.color).toBeNull();
    });

    it('returns 400 when label is missing', async () => {
      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/labels`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({});

      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent conversation', async () => {
      const response = await request(app)
        .post('/api/messages/conversations/00000000-0000-0000-0000-000000000000/labels')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'urgent' });

      expect(response.status).toBe(404);
    });

    it('returns 400 when the 10-label limit is exceeded', async () => {
      for (let i = 0; i < 10; i++) {
        await db.ConversationLabel.create({
          conversation_id: conversation.id,
          label: `label-${i}`,
          created_by: dietitianAuth.user.id,
        });
      }

      const response = await request(app)
        .post(`/api/messages/conversations/${conversation.id}/labels`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'overflow-label' });

      expect(response.status).toBe(400);
    });
  });

  // ========================================
  // DELETE /api/messages/conversations/:id/labels/:labelId
  // ========================================
  describe('DELETE /api/messages/conversations/:id/labels/:labelId', () => {
    let conversation;
    let label;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });
      label = await db.ConversationLabel.create({
        conversation_id: conversation.id,
        label: 'to-remove',
        created_by: dietitianAuth.user.id,
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).delete(
        `/api/messages/conversations/${conversation.id}/labels/${label.id}`
      );
      expect(response.status).toBe(401);
    });

    it('removes a label and returns 200', async () => {
      const response = await request(app)
        .delete(`/api/messages/conversations/${conversation.id}/labels/${label.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const found = await db.ConversationLabel.findByPk(label.id);
      expect(found).toBeNull();
    });

    it('returns 404 for non-existent label', async () => {
      const response = await request(app)
        .delete(
          `/api/messages/conversations/${conversation.id}/labels/00000000-0000-0000-0000-000000000000`
        )
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(404);
    });

    it('returns 404 when label belongs to a different conversation', async () => {
      const otherConvo = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });

      const response = await request(app)
        .delete(`/api/messages/conversations/${otherConvo.id}/labels/${label.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(404);
    });
  });

  // ========================================
  // PUT /api/messages/messages/:messageId
  // ========================================
  describe('PUT /api/messages/messages/:messageId', () => {
    let conversation;
    let message;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });
      message = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: dietitianAuth.user.id,
        content: 'Original content',
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .put(`/api/messages/messages/${message.id}`)
        .send({ content: 'Edited' });

      expect(response.status).toBe(401);
    });

    it('returns 403 for assistant (no messages.update)', async () => {
      const response = await request(app)
        .put(`/api/messages/messages/${message.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ content: 'Edited' });

      expect(response.status).toBe(403);
    });

    it('edits message content as sender and returns 200', async () => {
      const response = await request(app)
        .put(`/api/messages/messages/${message.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Edited content' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Edited content');
      expect(response.body.data.edited_at).not.toBeNull();
    });

    it('preserves original_content on first edit', async () => {
      const response = await request(app)
        .put(`/api/messages/messages/${message.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Edited content' });

      expect(response.status).toBe(200);
      expect(response.body.data.original_content).toBe('Original content');
    });

    it('returns 404 for non-existent message', async () => {
      const response = await request(app)
        .put('/api/messages/messages/00000000-0000-0000-0000-000000000000')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Edited' });

      expect(response.status).toBe(404);
    });

    it('returns 403 when user tries to edit a message they did not send', async () => {
      const adminMessage = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: adminAuth.user.id,
        content: 'Admin message',
      });

      const response = await request(app)
        .put(`/api/messages/messages/${adminMessage.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Try to edit admin message' });

      expect(response.status).toBe(403);
    });

    it('returns 400 when content is empty', async () => {
      const response = await request(app)
        .put(`/api/messages/messages/${message.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('includes sender in response', async () => {
      const response = await request(app)
        .put(`/api/messages/messages/${message.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ content: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.sender).toBeDefined();
      expect(response.body.data.sender.id).toBe(dietitianAuth.user.id);
    });
  });

  // ========================================
  // DELETE /api/messages/messages/:messageId
  // ========================================
  describe('DELETE /api/messages/messages/:messageId', () => {
    let conversation;
    let message;

    beforeEach(async () => {
      conversation = await db.Conversation.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'open',
      });
      message = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: dietitianAuth.user.id,
        content: 'To be deleted',
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).delete(
        `/api/messages/messages/${message.id}`
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 for assistant (no messages.delete)', async () => {
      const response = await request(app)
        .delete(`/api/messages/messages/${message.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(response.status).toBe(403);
    });

    it('soft-deletes a message as sender and returns 200', async () => {
      const response = await request(app)
        .delete(`/api/messages/messages/${message.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Paranoid: findByPk without paranoid:false returns null after soft delete
      const found = await db.Message.findByPk(message.id);
      expect(found).toBeNull();

      // But still exists with paranoid:false
      const foundWithDeleted = await db.Message.findByPk(message.id, { paranoid: false });
      expect(foundWithDeleted).not.toBeNull();
      expect(foundWithDeleted.deleted_at).not.toBeNull();
    });

    it('returns 404 for non-existent message', async () => {
      const response = await request(app)
        .delete('/api/messages/messages/00000000-0000-0000-0000-000000000000')
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(404);
    });

    it('returns 403 when user tries to delete a message they did not send', async () => {
      const adminMessage = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: adminAuth.user.id,
        content: 'Admin message',
      });

      const response = await request(app)
        .delete(`/api/messages/messages/${adminMessage.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(response.status).toBe(403);

      // Verify it was not deleted
      const found = await db.Message.findByPk(adminMessage.id);
      expect(found).not.toBeNull();
    });
  });
});
