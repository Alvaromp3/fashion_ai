'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { isAuthEnabled } = require('../../middleware/auth');

const tinyJpegPath = path.join(__dirname, '../fixtures/tiny.jpg');
const anonymousUploadsDir = path.join(__dirname, '../../uploads/anonymous');

describe.skipIf(isAuthEnabled)('POST /api/prendas/auto limit (IT-A5, anonymous Auth0)', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    process.env.PRENDAS_MAX_PER_USER = '1';
    vi.resetModules();
    ({ app } = require('../../app'));

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    delete process.env.PRENDAS_MAX_PER_USER;
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    if (fs.existsSync(anonymousUploadsDir)) {
      fs.rmSync(anonymousUploadsDir, { recursive: true, force: true });
    }
  });

  it('returns 429 when user reaches PRENDAS_MAX_PER_USER', async () => {
    const imageBase64 = fs.readFileSync(tinyJpegPath).toString('base64');
    const payload = {
      tipo: 'superior',
      color: 'azul',
      imagen_base64: imageBase64,
      clase_nombre: 'Shirt',
      confianza: 0.9,
      ocasion: ['casual']
    };

    await request(app).post('/api/prendas/auto').send(payload).expect(201);
    const res = await request(app).post('/api/prendas/auto').send(payload).expect(429);
    expect(res.body.error).toMatch(/limit/i);
    expect(res.body.limit).toBe(1);
  });
});
