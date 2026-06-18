const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/interview.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/',                  authorize('employer'),   ctrl.scheduleInterview);
router.get('/',                   ctrl.getMyInterviews);
router.get('/:id',                ctrl.getInterview);
router.post('/:id/start',         ctrl.startInterview);
router.post('/:id/end',           ctrl.endInterview);
router.post('/:id/emotion-frame', authorize('candidate'), ctrl.saveEmotionFrame);
router.get('/:id/report',         ctrl.getInterviewReport);
router.patch('/:id/notes',        authorize('employer'),  ctrl.addRecruiterNotes);

module.exports = router;