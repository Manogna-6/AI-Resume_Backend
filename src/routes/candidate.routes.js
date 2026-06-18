const express     = require('express');
const router      = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const Resume      = require('../models/Resume.model');
const Application = require('../models/Application.model');
const User        = require('../models/User.model');

router.use(protect);

router.get('/', authorize('employer', 'admin'), async (req, res, next) => {
  try {
    const { jobId, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (jobId)  query.job = jobId;
    if (status) query.status = status;
    const applications = await Application.find(query)
      .populate('candidate', 'firstName lastName email profile avatar')
      .populate('resume', 'scores insights parsed.skills parsed.totalYearsOfExperience')
      .populate('job', 'title')
      .sort({ matchScore: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (err) { next(err); }
});

router.get('/:candidateId', authorize('employer', 'admin'), async (req, res, next) => {
  try {
    const candidate = await User.findById(req.params.candidateId).select('-password');
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const resume = await Resume.findOne({ candidate: req.params.candidateId, isActive: true }).select('-rawText');
    res.status(200).json({ success: true, data: { candidate, resume } });
  } catch (err) { next(err); }
});

module.exports = router;