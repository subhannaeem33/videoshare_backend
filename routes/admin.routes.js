const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const adminCtrl = require('../controllers/admin.controller');
const { authRequired, requireRole } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', authRequired, ctrl.me);

router.post('/promote/:userId', authRequired, requireRole('ADMIN'), adminCtrl.promote);
router.get('/users', authRequired, requireRole('ADMIN'), adminCtrl.listUsers);

router.get('/videos', authRequired, requireRole('ADMIN'), adminCtrl.listVideosWithStats);

router.get('/users/count', authRequired, requireRole('ADMIN'), adminCtrl.getUserCount)
router.get('/videos/count', authRequired, requireRole('ADMIN'), adminCtrl.getVideoCount)
module.exports = router;
