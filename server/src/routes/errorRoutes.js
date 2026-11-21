const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/errorController');
router.use(protect);
router.get('/repositories', controller.repositories);
router.route('/').get(controller.list).delete(controller.removeRepository);
router.patch('/:id/status', controller.updateStatus);
router.delete('/:id', controller.remove);
module.exports = router;
