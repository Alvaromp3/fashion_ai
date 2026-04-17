'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');

describe('GET /api/health (IT-A1)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('returns OK when MongoDB is connected', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.mongodb).toBe('connected');
    expect(res.body.status).toBe('OK');
    expect(res.body.message).toMatch(/Fashion AI Backend/);
  });
});
