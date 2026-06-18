const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/resume.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadResume }       = require('../middleware/upload.middleware');

router.use(protect);
router.post('/upload',        authorize('candidate'), uploadResume, ctrl.uploadResume);
router.get('/my',             authorize('candidate'), ctrl.getMyResume);
router.get('/match-jobs',     authorize('candidate'), ctrl.getMatchedJobs);
router.get('/:id/status',     ctrl.getResumeStatus);
router.get('/:id',            ctrl.getResumeById);
router.post('/:id/reanalyze', authorize('candidate'), ctrl.reanalyzeResume);
router.delete('/:id',         authorize('candidate'), ctrl.deleteResume);

module.exports = router;