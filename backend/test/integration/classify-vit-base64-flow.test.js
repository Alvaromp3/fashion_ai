'use strict';

/**
 * Traceability (same production code as unit tests below):
 * - test/unit/vitClassToTipo.test.js
 * - test/unit/safeOutboundUrl.test.js (buildMlClassifyUrl, ML_VIT_SERVICE_URL)
 * - test/unit/safeMirrorImageUrl.test.js (data URL gate before classify)
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const axios = require('axios');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');

const tinyJpegPath = path.join(__dirname, '../fixtures/tiny.jpg');

describe('POST /api/classify/vit-base64 combined flow', () => {
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
    process.env.ML_VIT_SERVICE_URL = 'http://ml:6001/';
  });

  afterEach(() => {
    delete process.env.ML_VIT_SERVICE_URL;
  });

  it('validates base64 image, hits safe /classify-vit URL, and maps Sneaker => zapatos', async () => {
    const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(tinyJpegPath).toString('base64')}`;

    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        tipo: 'desconocido',
        color: 'azul',
        confianza: 0.5,
        clase_nombre: 'desconocido',
        top3: [{ clase_nombre: 'Sneaker', confidence: 0.91, class_index: 7 }]
      }
    });

    const res = await request(app)
      .post('/api/classify/vit-base64')
      .send({ imageDataUrl: dataUrl })
      .expect(200);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe('http://ml:6001/classify-vit');
    expect(res.body.tipo).toBe('zapatos');
    expect(res.body.clase_nombre).toBe('Sneaker');
    expect(res.body.confianza).toBe(0.91);
  });
});
