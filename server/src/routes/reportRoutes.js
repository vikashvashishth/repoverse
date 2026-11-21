const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { download } = require('../controllers/reportController');
router.get('/:analysisId', protect, download);
module.exports = router;
