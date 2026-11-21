const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { getAnalysis } = require('../controllers/analysisController');
router.get('/:analysisId', protect, getAnalysis);
module.exports = router;
