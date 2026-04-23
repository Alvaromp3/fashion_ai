'use strict';

/**
 * Traceability: IT-A3 Outfit Recommendation (FR-2)
 * - GET /api/outfits/recommend + MongoDB Prenda seed
 * - scoreOutfitCompatibility via route; sorted top-3 response
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { isAuthEnabled } = require('../../middleware/auth');
const Prenda = require('../../models/Prenda');

const basePrenda = {
  userId: 'anonymous',
  imagen_url: 'https://example.test/wardrobe.jpg',
  confianza: 0.95,
  ocasion: ['casual']
};

describe.skipIf(isAuthEnabled)('GET /api/outfits/recommend (IT-A3, anonymous Auth0)', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    vi.resetModules();
    ({ app } = require('../../app'));
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Prenda.deleteMany({});
  });

  async function seedAdequateWardrobe() {
    const tops = [
      new Prenda({ ...basePrenda, tipo: 'superior', clase_nombre: 'T-shirt', color: 'blanco' }),
      new Prenda({ ...basePrenda, tipo: 'superior', clase_nombre: 'T-shirt', color: 'azul' })
    ];
    const bottoms = [
      new Prenda({ ...basePrenda, tipo: 'inferior', clase_nombre: 'Trouser', color: 'negro' }),
      new Prenda({ ...basePrenda, tipo: 'inferior', clase_nombre: 'Trouser', color: 'gris' })
    ];
    const shoes = [
      new Prenda({ ...basePrenda, tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'blanco' }),
      new Prenda({ ...basePrenda, tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'negro' })
    ];
    await Prenda.insertMany([...tops, ...bottoms, ...shoes]);
  }

  it('adequate wardrobe: 200, 3 outfits, puntuacion in [38,97], non-empty explicaciones', async () => {
    await seedAdequateWardrobe();
    const res = await request(app).get('/api/outfits/recommend').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    const scores = res.body.map((o) => o.puntuacion);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
    for (const outfit of res.body) {
      expect(outfit.puntuacion).toBeGreaterThanOrEqual(38);
      expect(outfit.puntuacion).toBeLessThanOrEqual(97);
      expect(Array.isArray(outfit.explicaciones)).toBe(true);
      expect(outfit.explicaciones.length).toBeGreaterThan(0);
    }
  });

  it('missing bottoms: 400 with insufficient-garments error', async () => {
    await Prenda.insertMany([
      new Prenda({ ...basePrenda, tipo: 'superior', clase_nombre: 'T-shirt', color: 'blanco' }),
      new Prenda({ ...basePrenda, tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'negro' })
    ]);
    const res = await request(app).get('/api/outfits/recommend').expect(400);
    expect(res.body.error).toMatch(/not enough garments|at least 1 top.*bottom.*shoe/i);
  });

  it('occasion formal: 200 and top outfit mentions formal occasion', async () => {
    await Prenda.insertMany([
      new Prenda({ ...basePrenda, tipo: 'superior', clase_nombre: 'Pullover', color: 'gris' }),
      new Prenda({ ...basePrenda, tipo: 'superior', clase_nombre: 'Pullover', color: 'negro' }),
      new Prenda({ ...basePrenda, tipo: 'inferior', clase_nombre: 'Trouser', color: 'negro' }),
      new Prenda({ ...basePrenda, tipo: 'inferior', clase_nombre: 'Trouser', color: 'gris' }),
      new Prenda({ ...basePrenda, tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'blanco' }),
      new Prenda({ ...basePrenda, tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'negro' })
    ]);
    const res = await request(app).get('/api/outfits/recommend').query({ ocasion: 'formal' }).expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const top = res.body[0];
    const text = (top.explicaciones || []).join(' ').toLowerCase();
    expect(text).toContain('formal');
    expect(text).toContain('occasion');
  });
});
