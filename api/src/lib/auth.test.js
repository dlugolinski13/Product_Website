import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';

const nodeRequire = createRequire(import.meta.url);
const { signToken, verifyRequest, requireRole } = nodeRequire('./auth.js');

function requestWithHeader(value) {
  return { headers: { get: (name) => (name === 'x-authorization' ? value : undefined) } };
}

describe('auth', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  describe('signToken', () => {
    it('signs a token carrying the user id, role, and email', () => {
      const token = signToken({ id: 'user-1', role: 'admin', email: 'a@example.com' });
      const decoded = jwt.verify(token, 'test-secret');
      expect(decoded.sub).toBe('user-1');
      expect(decoded.role).toBe('admin');
      expect(decoded.email).toBe('a@example.com');
    });
  });

  describe('verifyRequest', () => {
    it('returns the claims for a valid X-Authorization bearer token', () => {
      const token = signToken({ id: 'user-1', role: 'customer', email: 'c@example.com' });
      const claims = verifyRequest(requestWithHeader(`Bearer ${token}`));
      expect(claims.sub).toBe('user-1');
      expect(claims.role).toBe('customer');
    });

    it('returns null when the header is missing', () => {
      expect(verifyRequest(requestWithHeader(undefined))).toBeNull();
    });

    it('returns null when the scheme is not Bearer', () => {
      const token = signToken({ id: 'user-1', role: 'customer', email: 'c@example.com' });
      expect(verifyRequest(requestWithHeader(`Basic ${token}`))).toBeNull();
    });

    it('returns null for a malformed token', () => {
      expect(verifyRequest(requestWithHeader('Bearer not-a-real-token'))).toBeNull();
    });

    it('returns null for a token signed with a different secret', () => {
      const token = jwt.sign({ sub: 'user-1', role: 'admin' }, 'wrong-secret');
      expect(verifyRequest(requestWithHeader(`Bearer ${token}`))).toBeNull();
    });
  });

  describe('requireRole', () => {
    it('returns 401 when there is no valid token', () => {
      const result = requireRole(requestWithHeader(undefined));
      expect(result).toEqual({ ok: false, status: 401 });
    });

    it('returns 403 when the role does not match', () => {
      const token = signToken({ id: 'user-1', role: 'customer', email: 'c@example.com' });
      const result = requireRole(requestWithHeader(`Bearer ${token}`), 'admin');
      expect(result).toEqual({ ok: false, status: 403 });
    });

    it('returns ok with claims when no specific role is required', () => {
      const token = signToken({ id: 'user-1', role: 'customer', email: 'c@example.com' });
      const result = requireRole(requestWithHeader(`Bearer ${token}`));
      expect(result.ok).toBe(true);
      expect(result.claims.role).toBe('customer');
    });

    it('returns ok with claims when the role matches', () => {
      const token = signToken({ id: 'user-1', role: 'admin', email: 'a@example.com' });
      const result = requireRole(requestWithHeader(`Bearer ${token}`), 'admin');
      expect(result.ok).toBe(true);
      expect(result.claims.role).toBe('admin');
    });
  });
});
