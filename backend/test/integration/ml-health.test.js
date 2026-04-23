'use strict';

/** Traceability: ML reachability in app.js (axios to ML_SERVICE_URL); no test/unit/*.test.js overlap. */

const request = require('supertest');
const axios = require('axios');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');

describe('GET /api/ml-health (IT-A3)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 when ML /health succeeds (axios mocked)', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: { status: 'OK', model_loaded: true, vit_model_loaded: true }
    });

    const res = await request(app).get('/api/ml-health').expect(200);
    expect(res.body.available).toBe(true);
    expect(res.body.status).toBe('OK');
  });

  it('returns 503 when ML unreachable', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({ code: 'ECONNREFUSED', message: 'conn refused' });

    const res = await request(app).get('/api/ml-health').expect(503);
    expect(res.body.available).toBe(false);
    expect(res.body.error).toMatch(/ML service not running/);
  });
});
