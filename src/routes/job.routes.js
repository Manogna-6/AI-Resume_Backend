const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/job.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/',    ctrl.getJobs);
router.get('/:id', ctrl.getJob);

router.use(protect);
router.post('/',                            authorize('employer', 'admin'), ctrl.createJob);
router.put('/:id',                          authorize('employer', 'admin'), ctrl.updateJob);
router.delete('/:id',                       authorize('employer', 'admin'), ctrl.deleteJob);
router.get('/employer/my-jobs',             authorize('employer'),          ctrl.getMyJobs);
router.post('/:id/apply',                   authorize('candidate'),         ctrl.applyToJob);
router.get('/:id/applications',             authorize('employer', 'admin'), ctrl.getJobApplications);
router.patch('/applications/:appId/status', authorize('employer', 'admin'), ctrl.updateApplicationStatus);
router.get('/my-applications',              authorize('candidate'),         ctrl.getMyApplications);

module.exports = router;