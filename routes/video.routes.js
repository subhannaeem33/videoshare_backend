const router = require('express').Router();
const ctrl = require('../controllers/video.controller');
const { authRequired, requireRole } = require('../middleware/auth');

router.get('/latest', ctrl.latest);
router.get('/search', ctrl.search);
router.get('/:id', ctrl.getOne);

router.post('/upload-url', authRequired, requireRole('CREATOR', 'ADMIN'), ctrl.requestUpload);
router.post('/finalize', authRequired, requireRole('CREATOR', 'ADMIN'), ctrl.finalizeUpload);
router.post('/:id/rate', authRequired, ctrl.rate);

// List creator's videos
router.get('/creator/:creatorId', authRequired, ctrl.listByCreator);

// Update metadata
router.put('/:id', authRequired, ctrl.updateMeta);

// Upload poster image
router.post('/:id/poster', authRequired, ctrl.uploadPoster);

router.post('/:id/poster-url', authRequired, ctrl.getPosterSasUrl);
// Set public URL of poster after successful upload
router.put('/:id/poster-url', authRequired, ctrl.setPosterUrl);
module.exports = router;
