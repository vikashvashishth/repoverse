const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const { ask, explainError, changeImpact } = require('../controllers/aiController');

const aiLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/ask', protect, aiLimit, ask);
router.post('/explain-error', protect, aiLimit, explainError);
router.post('/change-impact', protect, aiLimit, changeImpact);

module.exports = router;
