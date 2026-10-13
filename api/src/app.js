const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { UPLOAD_ROOT } = require('./utils/file');

const app = express();
// Behind Railway's proxy: use X-Forwarded-For for client IPs (rate limiting).
app.set('trust proxy', 1);

// cross-origin so the admin panel / website (different origin) can display uploaded images.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// CORS: only the origins in CORS_ORIGINS when set, otherwise every origin (development).
app.use(cors(env.corsOrigins.length ? { origin: env.corsOrigins } : {}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

app.use('/uploads', express.static(UPLOAD_ROOT));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
