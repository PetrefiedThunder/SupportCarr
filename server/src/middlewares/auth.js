const jwt = require('jsonwebtoken');

function authenticate(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith('Bearer ') ? header.replace('Bearer ', '') : null;
    const token = bearerToken || req.query?.token;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.user = payload;

      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = authenticate;
