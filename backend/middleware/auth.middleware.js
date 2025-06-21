const tokenfunc = require('./token.middleware.js');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Token requerido.' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Formato de token invalido.' });
  }
  const token = parts[1];
  const decoded = tokenfunc.decode(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Token invalido.' });
  }
  req.user = decoded;
  next();
}

module.exports = verifyToken;
