'use strict';

/**
 * Traceability:
 * - test/unit/mongoSafe.test.js (parseAuthSubject path for anonymous user)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { isAuthEnabled } = require('../../middleware/auth');
const { app } = require('../../app');

describe.skipIf(isAuthEnabled)('GET /api/me (IT-A4, anonymous Auth0)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('returns 200 with anonymous user when Auth0 is not configured', async () => {
    const res = await request(app).get('/api/me').expect(200);
    expect(res.body).toHaveProperty('sub', 'anonymous');
  });
});
