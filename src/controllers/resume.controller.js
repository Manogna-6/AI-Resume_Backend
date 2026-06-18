const Resume        = require('../models/Resume.model');
const Job           = require('../models/Job.model');
const resumeService = require('../services/resume.service');
const aiService     = require('../services/ai/ai.service');
const fs            = require('fs');
const logger        = require('../config/logger');

exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a resume file.' });
    }
    await Resume.updateMany({ candidate: req.user.id, isActive: true }, { isActive: false });
    const resume = await Resume.create({
      candidate: req.user.id,
      file: {
        originalName: req.file.originalname,
        storedName  : req.file.filename,
        path        : req.file.path,
        mimetype    : req.file.mimetype,
        size        : req.file.size,
        url         : '/uploads/resumes/' + req.file.filename,
      },
      status: 'pending',
    });
    resumeService.analyzeResume(resume._id.toString())
      .catch(err => logger.error('[Resume] Error: ' + err.message));
    res.status(201).json({
      success: true,
      message: 'Resume uploaded. AI analysis started.',
      data   : { resumeId: resume._id, status: resume.status },
    });
  } catch (err) { next(err); }
};

exports.getResumeStatus = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, candidate: req.user.id })
      .select('status analyzedAt scores.overall');
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
    res.status(200).json({ success: true, data: resume });
  } catch (err) { next(err); }
};

exports.getMyResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ candidate: req.user.id, isActive: true })
      .populate('jobMatches.job', 'title company location type');
    if (!resume) return res.status(404).json({ success: false, message: 'No resume found.' });
    res.status(200).json({ success: true, data: resume });
  } catch (err) { next(err); }
};

exports.getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id)
      .populate('candidate', 'firstName lastName email');
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
    if (req.user.role === 'candidate' && resume.candidate._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    res.status(200).json({ success: true, data: resume });
  } catch (err) { next(err); }
};

exports.reanalyzeResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, candidate: req.user.id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
    await Resume.findByIdAndUpdate(resume._id, { status: 'pending' });
    resumeService.analyzeResume(resume._id.toString());
    res.status(200).json({ success: true, message: 'Re-analysis started.' });
  } catch (err) { next(err); }
};

exports.getMatchedJobs = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ candidate: req.user.id, isActive: true, status: 'analyzed' });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'No analyzed resume found. Upload and analyze first.' });
    }
    const jobs = await Job.find({ status: 'active' }).limit(50);
    const matchResults = await Promise.allSettled(
      jobs.map(job => aiService.matchCandidateToJob(resume.parsed, job))
    );
    const matches = jobs
      .map((job, i) => ({
        job,
        ...(matchResults[i].status === 'fulfilled' ? matchResults[i].value : { matchScore: 0 }),
      }))
      .filter(m => m.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);
    res.status(200).json({ success: true, count: matches.length, data: matches });
  } catch (err) { next(err); }
};

exports.deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, candidate: req.user.id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
    if (fs.existsSync(resume.file.path)) fs.unlinkSync(resume.file.path);
    await resume.deleteOne();
    res.status(200).json({ success: true, message: 'Resume deleted.' });
  } catch (err) { next(err); }
};