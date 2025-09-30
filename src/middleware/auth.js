const { errorResponse } = require('./responseHandler');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  errorResponse(res, 'Необходима аутентификация', 401);
}

module.exports = { ensureAuthenticated };