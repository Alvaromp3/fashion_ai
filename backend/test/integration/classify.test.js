'use strict';

const path = require('path');
const request = require('supertest');
const axios = require('axios');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');

const tinyJpegPath = path.join(__dirname, '../fixtures/tiny.jpg');

describe('POST /api/classify (IT-A2)', () => {
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

  it('returns 400 when no image', async () => {
    const res = await request(app).post('/api/classify').expect(400);
    expect(res.body.error).toMatch(/No image/i);
  });

  it('returns classification JSON when ML responds (axios mocked)', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        tipo: 'desconocido',
        color: 'azul',
        confianza: 0.91,
        clase_nombre: 'desconocido',
        top3: [{ clase_nombre: 'Sneaker', confidence: 0.91, class_index: 7 }]
      }
    });

    const res = await request(app)
      .post('/api/classify')
      .attach('imagen', tinyJpegPath)
      .expect(200);

    expect(postSpy).toHaveBeenCalled();
    expect(res.body.tipo).toBe('zapatos');
    expect(res.body.clase_nombre).toMatch(/Sneaker|sneaker/i);
    expect(res.body.top3).toHaveLength(1);
  });
});
