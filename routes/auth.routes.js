const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const adminCtrl = require('../controllers/admin.controller');
const { authRequired, requireRole } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', authRequired, ctrl.me);

module.exports = router;
