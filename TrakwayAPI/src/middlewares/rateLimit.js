const { rateLimit } = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

// Limits how often one IP can hit a route, answering 429 in our JSON format.
//   count: 'success' — only successful requests count (forms: a typo doesn't use up the limit)
//   count: 'failed'  — only failed requests count (login / OTP checks: stops guessing)
// Behind a reverse proxy (nginx, load balancer) set app 'trust proxy' so the real client IP is used.
function limitRequests({ windowMinutes, max, message, count = 'success' }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipFailedRequests: count === 'success',
    skipSuccessfulRequests: count === 'failed',
    handler: (req, res, next) => next(new ApiError(429, message)),
  });
}

module.exports = { limitRequests };
