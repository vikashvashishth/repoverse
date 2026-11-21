const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { signup, login, me } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many authentication attempts. Please try again later.' } });
router.post('/signup', authLimit, signup);
router.post('/login', authLimit, login);
router.get('/me', protect, me);
module.exports = router;
