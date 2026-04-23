'use strict';

/**
 * buildMlClassifyUrl — integration: test/integration/classify.test.js, classify-vit-base64-flow.test.js
 * buildMlProxyGetUrl — production: routes/model.js (no Supertest file in test/integration yet)
 */

const {
  buildMlClassifyUrl,
  buildMlProxyGetUrl,
  ALLOWED_ML_CLASSIFY_PATHS
} = require('../../utils/safeOutboundUrl');

describe('safeOutboundUrl.buildMlClassifyUrl', () => {
  it('builds classify-vit URL for localhost default', () => {
    expect(buildMlClassifyUrl('http://localhost:6001', '/classify-vit')).toBe(
      'http://localhost:6001/classify-vit'
    );
  });

  it('strips trailing slash on base', () => {
    expect(buildMlClassifyUrl('http://ml:6001/', '/classify')).toBe('http://ml:6001/classify');
  });

  it('throws on disallowed endpoint', () => {
    expect(() => buildMlClassifyUrl('http://localhost:6001', '/evil')).toThrow(/Invalid ML classification/);
  });

  it('throws on invalid protocol', () => {
    expect(() => buildMlClassifyUrl('ftp://x', '/classify')).toThrow(/http or https/);
  });
});

describe('safeOutboundUrl.buildMlProxyGetUrl', () => {
  it('allows metrics path', () => {
    expect(buildMlProxyGetUrl('http://localhost:6001', '/metrics')).toContain('/metrics');
  });

  it('rejects path not in allowlist', () => {
    expect(() => buildMlProxyGetUrl('http://localhost:6001', '/admin')).toThrow(/Invalid ML proxy/);
  });
});

describe('ALLOWED_ML_CLASSIFY_PATHS', () => {
  it('contains vit and legacy classify', () => {
    expect(ALLOWED_ML_CLASSIFY_PATHS.has('/classify-vit')).toBe(true);
    expect(ALLOWED_ML_CLASSIFY_PATHS.has('/classify')).toBe(true);
  });
});
