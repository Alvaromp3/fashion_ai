'use strict';

/** Integration: test/integration/classify-vit-base64-flow.test.js */

const { validateMirrorImageUrl, MAX_DATA_URL_LEN } = require('../../utils/safeMirrorImageUrl');

describe('validateMirrorImageUrl', () => {
  it('rejects empty', () => {
    const r = validateMirrorImageUrl('');
    expect(r.ok).toBe(false);
  });

  it('accepts valid data URL jpeg', () => {
    const b64 = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0, 0]).toString('base64');
    const url = `data:image/jpeg;base64,${b64}`;
    const r = validateMirrorImageUrl(url);
    expect(r.ok).toBe(true);
  });

  it('rejects data URL without base64 marker', () => {
    const r = validateMirrorImageUrl('data:image/jpeg,xxx');
    expect(r.ok).toBe(false);
  });

  it('rejects non-https remote', () => {
    const r = validateMirrorImageUrl('http://example.com/x.jpg');
    expect(r.ok).toBe(false);
  });

  it('rejects loopback https host', () => {
    const r = validateMirrorImageUrl('https://127.0.0.1/x.jpg');
    expect(r.ok).toBe(false);
  });

  it('rejects private IP https', () => {
    const r = validateMirrorImageUrl('https://192.168.1.1/x.jpg');
    expect(r.ok).toBe(false);
  });

  it('rejects oversized string', () => {
    const r = validateMirrorImageUrl('x'.repeat(MAX_DATA_URL_LEN + 1));
    expect(r.ok).toBe(false);
  });
});
