const Interview   = require('../models/Interview.model');
const Application = require('../models/Application.model');
const aiService   = require('../services/ai/ai.service');
const { v4: uuidv4 } = require('uuid');
const logger      = require('../config/logger');

exports.scheduleInterview = async (req, res, next) => {
  try {
    const { applicationId, scheduledAt } = req.body;
    const application = await Application.findById(applicationId).populate('job');
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (application.job.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const roomId    = 'interview-' + uuidv4();
    const interview = await Interview.create({
      job        : application.job._id,
      candidate  : application.candidate,
      employer   : req.user.id,
      application: application._id,
      roomId,
      scheduledAt: new Date(scheduledAt),
      status     : 'scheduled',
    });
    application.status = 'interview-scheduled';
    application.interview = interview._id;
    application.timeline.push({ status: 'interview-scheduled', changedBy: req.user.id });
    await application.save();
    res.status(201).json({ success: true, data: interview });
  } catch (err) { next(err); }
};

exports.getInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('job', 'title company')
      .populate('candidate', 'firstName lastName email')
      .populate('employer', 'firstName lastName company');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    res.status(200).json({ success: true, data: interview });
  } catch (err) { next(err); }
};

exports.getMyInterviews = async (req, res, next) => {
  try {
    const filter = req.user.role === 'candidate'
      ? { candidate: req.user.id }
      : { employer: req.user.id };
    const interviews = await Interview.find(filter)
      .populate('job', 'title company')
      .populate('candidate', 'firstName lastName email')
      .populate('employer', 'firstName lastName company')
      .sort({ scheduledAt: -1 });
    res.status(200).json({ success: true, count: interviews.length, data: interviews });
  } catch (err) { next(err); }
};

exports.saveEmotionFrame = async (req, res, next) => {
  try {
    const { emotionData, timestamp } = req.body;
    await Interview.findByIdAndUpdate(req.params.id, {
      $push: {
        emotionTimeline: {
          timestamp   : new Date(timestamp),
          emotions    : emotionData.emotions,
          dominant    : emotionData.dominant,
          confidence  : emotionData.confidence,
          faceDetected: emotionData.faceDetected,
        },
      },
    });
    res.status(200).json({ success: true, message: 'Frame saved.' });
  } catch (err) { next(err); }
};

exports.startInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { status: 'ongoing', startedAt: new Date() },
      { new: true }
    );
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    res.status(200).json({ success: true, data: interview });
  } catch (err) { next(err); }
};

exports.endInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id).populate('job', 'title');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    const endedAt  = new Date();
    const duration = Math.round((endedAt - (interview.startedAt || interview.scheduledAt)) / 60000);
    await Interview.findByIdAndUpdate(req.params.id, { status: 'completed', endedAt, duration });
    (async () => {
      try {
        const fresh = await Interview.findById(req.params.id);
        const emotionSummary = await aiService.interpretEmotionData(fresh.emotionTimeline);
        const aiReport = await aiService.generateInterviewReport(
          { duration, jobTitle: interview.job?.title },
          emotionSummary,
          fresh.questions
        );
        await Interview.findByIdAndUpdate(req.params.id, {
          emotionSummary,
          aiReport: { ...aiReport, generatedAt: new Date() },
        });
        await Application.findByIdAndUpdate(interview.application, { status: 'interviewed' });
      } catch (e) { logger.error('[Interview] Report error: ' + e.message); }
    })();
    res.status(200).json({ success: true, message: 'Interview ended. Report generating.' });
  } catch (err) { next(err); }
};

exports.getInterviewReport = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('job', 'title company')
      .populate('candidate', 'firstName lastName email');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (!interview.aiReport?.overallScore) {
      return res.status(202).json({ success: false, message: 'Report still generating. Try again shortly.' });
    }
    res.status(200).json({
      success: true,
      data   : { interview, aiReport: interview.aiReport, emotionSummary: interview.emotionSummary },
    });
  } catch (err) { next(err); }
};

exports.addRecruiterNotes = async (req, res, next) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, employer: req.user.id },
      { recruiterNotes: req.body.notes, recruiterRating: req.body.rating },
      { new: true }
    );
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    res.status(200).json({ success: true, data: interview });
  } catch (err) { next(err); }
};