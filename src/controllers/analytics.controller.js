const User        = require('../models/User.model');
const Job         = require('../models/Job.model');
const Resume      = require('../models/Resume.model');
const Application = require('../models/Application.model');
const Interview   = require('../models/Interview.model');
const mongoose    = require('mongoose');

exports.getEmployerAnalytics = async (req, res, next) => {
  try {
    const jobIds = await Job.find({ employer: req.user.id }).distinct('_id');
    const [totalJobs, activeJobs, totalApplications, interviews] = await Promise.all([
      Job.countDocuments({ employer: req.user.id }),
      Job.countDocuments({ employer: req.user.id, status: 'active' }),
      Application.countDocuments({ job: { $in: jobIds } }),
      Interview.countDocuments({ employer: req.user.id }),
    ]);
    const statusCounts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const recentApplications = await Application.find({ job: { $in: jobIds } })
      .populate('candidate', 'firstName lastName email')
      .populate('job', 'title')
      .sort({ createdAt: -1 })
      .limit(10);
    res.status(200).json({
      success: true,
      data   : { summary: { totalJobs, activeJobs, totalApplications, interviews }, statusFunnel: statusCounts, recentApplications },
    });
  } catch (err) { next(err); }
};

exports.getCandidateAnalytics = async (req, res, next) => {
  try {
    const candidateId = new mongoose.Types.ObjectId(req.user.id);
    const [resume, totalApplications, interviews, applicationsByStatus] = await Promise.all([
      Resume.findOne({ candidate: req.user.id, isActive: true }).select('scores insights analyzedAt status'),
      Application.countDocuments({ candidate: req.user.id }),
      Interview.countDocuments({ candidate: req.user.id }),
      Application.aggregate([
        { $match: { candidate: candidateId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    const recentApplications = await Application.find({ candidate: req.user.id })
      .populate('job', 'title company location type')
      .sort({ createdAt: -1 })
      .limit(5);
    res.status(200).json({
      success: true,
      data   : { resume: resume || null, totalApplications, interviews, applicationsByStatus, recentApplications },
    });
  } catch (err) { next(err); }
};

exports.getAdminAnalytics = async (req, res, next) => {
  try {
    const [totalUsers, totalJobs, totalResumes, totalApplications, totalInterviews, usersByRole] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Resume.countDocuments(),
      Application.countDocuments(),
      Interview.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);
    res.status(200).json({
      success: true,
      data   : { summary: { totalUsers, totalJobs, totalResumes, totalApplications, totalInterviews }, usersByRole },
    });
  } catch (err) { next(err); }
};