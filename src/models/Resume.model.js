const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Original file info
  file: {
    originalName: String,
    storedName  : String,
    path        : String,
    mimetype    : String,
    size        : Number,
    url         : String,
  },

  // Raw extracted text
  rawText: { type: String, select: false },

  // ── AI-Parsed Data (from Claude/NLP) ─────────────────────────────────────
  parsed: {
    name        : String,
    email       : String,
    phone       : String,
    location    : String,
    summary     : String,
    linkedIn    : String,
    github      : String,

    skills      : [String],
    techSkills  : [String],
    softSkills  : [String],

    experience: [{
      title      : String,
      company    : String,
      location   : String,
      startDate  : String,
      endDate    : String,
      current    : Boolean,
      description: String,
      duration   : Number, // months
    }],

    education: [{
      degree     : String,
      field      : String,
      institution: String,
      location   : String,
      startYear  : Number,
      endYear    : Number,
      cgpa       : String,
    }],

    certifications: [{
      name    : String,
      issuer  : String,
      date    : String,
      url     : String,
    }],

    projects: [{
      name       : String,
      description: String,
      techStack  : [String],
      url        : String,
    }],

    languages  : [String],
    totalYearsOfExperience: Number,
  },

  // ── AI Quality Scores ─────────────────────────────────────────────────────
  scores: {
    overall         : { type: Number, min: 0, max: 100, default: 0 },
    skillsMatch     : { type: Number, min: 0, max: 100, default: 0 },
    experienceScore : { type: Number, min: 0, max: 100, default: 0 },
    educationScore  : { type: Number, min: 0, max: 100, default: 0 },
    presentationScore: { type: Number, min: 0, max: 100, default: 0 },
    atsCompatibility: { type: Number, min: 0, max: 100, default: 0 },
  },

  // ── AI Insights ───────────────────────────────────────────────────────────
  insights: {
    strengths   : [String],
    weaknesses  : [String],
    suggestions : [String],
    keywords    : [String],
    missingSkills: [String],
    careerLevel : { type: String, enum: ['entry', 'mid', 'senior', 'lead', 'executive'] },
  },

  // ── Job Matches ───────────────────────────────────────────────────────────
  jobMatches: [{
    job        : { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    matchScore : Number,
    matchedAt  : { type: Date, default: Date.now },
  }],

  status    : { type: String, enum: ['pending', 'processing', 'analyzed', 'failed'], default: 'pending' },
  isActive  : { type: Boolean, default: true },
  analyzedAt: Date,
}, { timestamps: true });

// Index for fast candidate lookups
ResumeSchema.index({ candidate: 1, createdAt: -1 });
ResumeSchema.index({ 'scores.overall': -1 });

module.exports = mongoose.model('Resume', ResumeSchema);