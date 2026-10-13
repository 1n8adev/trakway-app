const jwt = require('jsonwebtoken');
const env = require('../config/env');

// expiresIn defaults to JWT_EXPIRES_IN (admin tokens); customer/reset tokens pass their own.
const sign = (payload, expiresIn = env.jwt.expiresIn) => jwt.sign(payload, env.jwt.secret, { expiresIn });
const verify = (token) => jwt.verify(token, env.jwt.secret);

module.exports = { sign, verify };
