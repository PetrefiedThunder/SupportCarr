const jwt = require('jsonwebtoken');

function authenticate(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith('Bearer ') ? header.replace('Bearer ', '') : null;
    const token = bearerToken || req.query?.token;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = payload;

      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = authenticate;
