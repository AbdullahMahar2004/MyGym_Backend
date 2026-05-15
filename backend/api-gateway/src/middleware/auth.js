const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });
    req.user = decoded; // { id, email, username, role }
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin')
    return res.status(403).json({ message: 'Admin access required' });
  next();
}

function requireMember(req, res, next) {
  if (req.user?.role !== 'Member')
    return res.status(403).json({ message: 'Member access required' });
  next();
}

module.exports = { verifyToken, requireAdmin, requireMember };
