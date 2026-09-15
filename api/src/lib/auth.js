import jwt from 'jsonwebtoken';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Azure Static Web Apps overwrites the standard "Authorization" header on managed
// Functions requests with its own token, so the JWT is sent as "X-Authorization" instead.
// See https://github.com/Azure/static-web-apps/issues/158
function verifyRequest(request) {
  const authHeader = request.headers.get('x-authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Re-checks the role claim on every product-management request, per CLAUDE.md's auth model.
function requireRole(request, role) {
  const claims = verifyRequest(request);
  if (!claims) return { ok: false, status: 401 };
  if (role && claims.role !== role) return { ok: false, status: 403 };
  return { ok: true, claims };
}

export { signToken, verifyRequest, requireRole };
