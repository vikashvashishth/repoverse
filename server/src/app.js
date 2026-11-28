const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(value => value.trim()).filter(Boolean)
  : ['http://localhost:5173', 'https://repoverse-rosy.vercel.app'];
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({
  limit: '256kb',
  verify: (req, _res, buffer) => { req.rawBody = buffer; }
}));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/repositories', require('./routes/repositoryRoutes'));
app.use('/api/webhooks/github', require('./routes/githubWebhookRoutes'));
app.use('/api/analysis', require('./routes/analysisRoutes'));
app.use('/api/apis', require('./routes/apiRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/errors', require('./routes/errorRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
