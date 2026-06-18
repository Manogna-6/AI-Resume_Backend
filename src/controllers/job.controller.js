const Job         = require('../models/Job.model');
const Application = require('../models/Application.model');
const Resume      = require('../models/Resume.model');
const aiService   = require('../services/ai/ai.service');

exports.createJob = async (req, res, next) => {
  try {
    const job = await Job.create({ ...req.body, employer: req.user.id });
    res.status(201).json({ success: true, data: job });
  } catch (err) { next(err); }
};

exports.getJobs = async (req, res, next) => {
  try {
    const { type, category, location, page = 1, limit = 10 } = req.query;
    const query = { status: 'active' };
    if (type)     query.type = type;
    if (category) query.category = category;
    if (location) query.location = new RegExp(location, 'i');
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Job.countDocuments(query);
    const jobs  = await Job.find(query)
      .populate('employer', 'firstName lastName company')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.status(200).json({
      success: true,
      count  : jobs.length,
      total,
      pages  : Math.ceil(total / Number(limit)),
      data   : jobs,
    });
  } catch (err) { next(err); }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('employer', 'firstName lastName company');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    await Job.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.status(200).json({ success: true, data: job });
  } catch (err) { next(err); }
};

exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, employer: req.user.id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found or not authorized.' });
    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, employer: req.user.id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found or not authorized.' });
    await job.deleteOne();
    res.status(200).json({ success: true, message: 'Job deleted.' });
  } catch (err) { next(err); }
};

exports.getMyJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ employer: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (err) { next(err); }
};

exports.applyToJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, status: 'active' });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found or no longer active.' });
    const already = await Application.findOne({ job: job._id, candidate: req.user.id });
    if (already) return res.status(409).json({ success: false, message: 'Already applied.' });
    const resume = await Resume.findOne({ candidate: req.user.id, isActive: true, status: 'analyzed' });
    if (!resume) {
      return res.status(400).json({ success: false, message: 'Please upload and analyze your resume first.' });
    }
    const matchResult = await aiService.matchCandidateToJob(resume.parsed, job);
    const application = await Application.create({
      job          : job._id,
      candidate    : req.user.id,
      resume       : resume._id,
      coverLetter  : req.body.coverLetter,
      matchScore   : matchResult?.matchScore || 0,
      matchBreakdown: matchResult?.breakdown || {},
      matchInsights : matchResult?.insights || [],
      timeline     : [{ status: 'applied', changedBy: req.user.id }],
    });
    await Job.findByIdAndUpdate(job._id, { $inc: { applications: 1 } });
    res.status(201).json({ success: true, message: 'Application submitted.', data: application });
  } catch (err) { next(err); }
};

exports.getJobApplications = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, employer: req.user.id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const applications = await Application.find({ job: req.params.id })
      .populate('candidate', 'firstName lastName email profile')
      .populate('resume', 'scores insights parsed.skills parsed.totalYearsOfExperience')
      .sort({ matchScore: -1 });
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (err) { next(err); }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.appId).populate('job');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (app.job.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    app.status = req.body.status;
    app.timeline.push({ status: req.body.status, changedBy: req.user.id, note: req.body.note });
    await app.save();
    res.status(200).json({ success: true, data: app });
  } catch (err) { next(err); }
};

exports.getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ candidate: req.user.id })
      .populate('job', 'title company location type status')
      .populate('resume', 'scores.overall')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (err) { next(err); }
};