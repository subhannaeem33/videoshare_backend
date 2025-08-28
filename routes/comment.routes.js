const router = require('express').Router();
const ctrl = require('../controllers/comment.controller');
const { authRequired } = require('../middleware/auth');

router.get('/:videoId', ctrl.list);
router.post('/:videoId', authRequired, ctrl.add);

module.exports = router;
