const jwt = require('jsonwebtoken');

/**
 * OAuth 2.0 PKCE / JWT verification middleware.
 * Expects a Bearer token in the Authorization header.
 */
function pkceJwtMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.sendStatus(401);
  }

  const token = authHeader.slice(7);
  try {
    const publicKey = process.env.JWT_PUBLIC_KEY || 'secret';
    const payload = jwt.verify(token, publicKey);
    req.user = payload;
    next();
  } catch (err) {
    next({ status: 401, message: 'Invalid token' });
  }
}

module.exports = pkceJwtMiddleware;
