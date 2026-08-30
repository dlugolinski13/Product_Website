const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function verifyRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
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

module.exports = { signToken, verifyRequest, requireRole };
