const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/employer',  authorize('employer', 'admin'), ctrl.getEmployerAnalytics);
router.get('/candidate', authorize('candidate'),         ctrl.getCandidateAnalytics);
router.get('/admin',     authorize('admin'),             ctrl.getAdminAnalytics);

module.exports = router;