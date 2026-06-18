const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  job       : { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resume    : { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },

  status: {
    type   : String,
    enum   : ['applied', 'screening', 'shortlisted', 'interview-scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn'],
    default: 'applied',
  },

  // AI Matching Score
  matchScore    : { type: Number, min: 0, max: 100, default: 0 },
  matchBreakdown: {
    skillsMatch    : Number,
    experienceMatch: Number,
    educationMatch : Number,
    overallFit     : Number,
  },
  matchInsights : [String],

  coverLetter: String,

  // Stage timestamps
  timeline: [{
    status   : String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note     : String,
  }],

  // Interview reference
  interview : { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },

  // Recruiter actions
  isShortlisted : { type: Boolean, default: false },
  recruiterNotes: String,
  rating        : { type: Number, min: 1, max: 5 },

  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// A candidate can only apply once per job
ApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
ApplicationSchema.index({ candidate: 1, status: 1 });
ApplicationSchema.index({ job: 1, matchScore: -1 });

module.exports = mongoose.model('Application', ApplicationSchema);