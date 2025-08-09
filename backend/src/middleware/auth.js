const admin = require('../../firebase');

module.exports = async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};

module.exports.requireAdmin = async function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.admin === true) {
      req.user = decodedToken;
      next();
    } else {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
  } catch (err) {
    return res.sendStatus(403);
  }
};
