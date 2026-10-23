/**
 * App Settings Integration Tests
 * Application-wide feature toggles (patient health score).
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('App settings', () => {
  let adminAuth;
  let dietitianAuth;

  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('defaults the health score to disabled when no setting exists', async () => {
    const res = await request(app).get('/api/app-settings').set('Authorization', dietitianAuth.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ patient_health_score_enabled: false });
  });

  it('lets an admin enable and disable the health score', async () => {
    const on = await request(app)
      .put('/api/app-settings')
      .set('Authorization', adminAuth.authHeader)
      .send({ patient_health_score_enabled: true });
    expect(on.status).toBe(200);
    expect(on.body.data.patient_health_score_enabled).toBe(true);

    const read = await request(app).get('/api/app-settings').set('Authorization', dietitianAuth.authHeader);
    expect(read.body.data.patient_health_score_enabled).toBe(true);

    const off = await request(app)
      .put('/api/app-settings')
      .set('Authorization', adminAuth.authHeader)
      .send({ patient_health_score_enabled: false });
    expect(off.body.data.patient_health_score_enabled).toBe(false);
  });

  it('only exposes whitelisted settings', async () => {
    const db = testDb.getDb();
    await db.SystemSetting.create({ setting_key: 'discord_webhook_url', setting_value: 'https://secret', data_type: 'string' });

    const res = await request(app).get('/api/app-settings').set('Authorization', dietitianAuth.authHeader);

    expect(res.body.data).not.toHaveProperty('discord_webhook_url');
  });

  it('rejects updates from non-admins', async () => {
    const res = await request(app)
      .put('/api/app-settings')
      .set('Authorization', dietitianAuth.authHeader)
      .send({ patient_health_score_enabled: true });

    expect(res.status).toBe(403);
  });

  it('rejects unknown keys and wrong types', async () => {
    const unknown = await request(app)
      .put('/api/app-settings')
      .set('Authorization', adminAuth.authHeader)
      .send({ discord_webhook_url: 'https://evil' });
    expect(unknown.status).toBe(400);

    const wrongType = await request(app)
      .put('/api/app-settings')
      .set('Authorization', adminAuth.authHeader)
      .send({ patient_health_score_enabled: 'yes' });
    expect(wrongType.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/app-settings');
    expect(res.status).toBe(401);
  });
});
