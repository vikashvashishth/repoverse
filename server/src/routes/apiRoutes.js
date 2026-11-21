const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const { inspectEndpoint, testEndpoint } = require('../controllers/apiController');
const apiLimit = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
router.post('/inspect', protect, apiLimit, inspectEndpoint);
router.post('/test', protect, apiLimit, testEndpoint);
module.exports = router;
