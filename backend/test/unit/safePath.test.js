'use strict';

const path = require('path');
const { resolveUnder, resolveUploadsPublicPath } = require('../../utils/safePath');

describe('safePath.resolveUnder', () => {
  const base = path.join(__dirname, 'fixtures');

  it('resolves nested path under base', () => {
    const r = resolveUnder(base, 'a', 'b.txt');
    expect(r).toBe(path.resolve(base, 'a', 'b.txt'));
  });

  it('throws when path escapes base via ..', () => {
    expect(() => resolveUnder(base, '..', 'outside')).toThrow(/escapes/);
  });
});

describe('safePath.resolveUploadsPublicPath', () => {
  const uploadsRoot = path.join(__dirname, 'fixtures');

  it('returns null for non-string', () => {
    expect(resolveUploadsPublicPath(null, uploadsRoot)).toBeNull();
  });

  it('returns null when URL does not start with /uploads/', () => {
    expect(resolveUploadsPublicPath('/other/x', uploadsRoot)).toBeNull();
  });

  it('returns null for empty path after prefix', () => {
    expect(resolveUploadsPublicPath('/uploads/', uploadsRoot)).toBeNull();
  });

  it('returns null when segment is . or ..', () => {
    expect(resolveUploadsPublicPath('/uploads/../etc/passwd', uploadsRoot)).toBeNull();
    expect(resolveUploadsPublicPath('/uploads/./x', uploadsRoot)).toBeNull();
  });

  it('resolves valid user/file path under uploads root', () => {
    const r = resolveUploadsPublicPath('/uploads/user1/photo.jpg', uploadsRoot);
    expect(r).toBe(path.join(uploadsRoot, 'user1', 'photo.jpg'));
  });
});
