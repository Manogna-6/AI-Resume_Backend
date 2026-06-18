const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  employer   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title      : { type: String, required: true, trim: true },
  description: { type: String, required: true },
  company    : { type: String, required: true },
  location   : { type: String, required: true },
  type       : { type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'], required: true },
  category   : { type: String, required: true },

  // Skills & Requirements
  requiredSkills : { type: [String], default: [] },
  preferredSkills: { type: [String], default: [] },
  requirements   : [String],
  responsibilities: [String],
  benefits       : [String],

  // Compensation
  salary: {
    min     : Number,
    max     : Number,
    currency: { type: String, default: 'INR' },
    period  : { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' },
  },

  // Requirements
  experience : { min: Number, max: Number },
  education  : String,
  openings   : { type: Number, default: 1 },
  deadline   : Date,

  // AI-generated fields
  aiKeywords     : [String],
  atsScore       : Number,
  matchingWeights: {
    skills    : { type: Number, default: 40 },
    experience: { type: Number, default: 30 },
    education : { type: Number, default: 20 },
    other     : { type: Number, default: 10 },
  },

  // Status
  status     : { type: String, enum: ['draft', 'active', 'paused', 'closed'], default: 'active' },
  isRemote   : { type: Boolean, default: false },
  isFeatured : { type: Boolean, default: false },

  // Metrics
  views        : { type: Number, default: 0 },
  applications : { type: Number, default: 0 },
}, { timestamps: true });

JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ requiredSkills: 1 });
JobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });

module.exports = mongoose.model('Job', JobSchema);