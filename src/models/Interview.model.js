const mongoose = require('mongoose');

// Per-frame emotion snapshot (recorded every ~2s during interview)
const EmotionSnapshotSchema = new mongoose.Schema({
  timestamp : { type: Date, required: true },
  emotions  : {
    happy     : { type: Number, min: 0, max: 1, default: 0 },
    sad       : { type: Number, min: 0, max: 1, default: 0 },
    angry     : { type: Number, min: 0, max: 1, default: 0 },
    fearful   : { type: Number, min: 0, max: 1, default: 0 },
    disgusted : { type: Number, min: 0, max: 1, default: 0 },
    surprised : { type: Number, min: 0, max: 1, default: 0 },
    neutral   : { type: Number, min: 0, max: 1, default: 0 },
  },
  dominant  : String,  // e.g. 'happy'
  confidence: Number,  // 0-1
  faceDetected: Boolean,
}, { _id: false });

const InterviewSchema = new mongoose.Schema({
  job        : { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate  : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employer   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },

  roomId     : { type: String, unique: true, required: true },
  scheduledAt: { type: Date, required: true },
  startedAt  : Date,
  endedAt    : Date,
  duration   : Number, // minutes

  status: {
    type   : String,
    enum   : ['scheduled', 'ongoing', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
  },

  // Questions asked during interview
  questions: [{
    text      : String,
    askedAt   : Date,
    answerText: String,   // Transcript if available
    duration  : Number,   // Seconds
  }],

  // ── Emotion Analysis ──────────────────────────────────────────────────────
  emotionTimeline: [EmotionSnapshotSchema],

  // Aggregated emotion summary (computed after interview ends)
  emotionSummary: {
    averageEmotions: {
      happy    : Number,
      sad      : Number,
      angry    : Number,
      fearful  : Number,
      disgusted: Number,
      surprised: Number,
      neutral  : Number,
    },
    dominantOverall  : String,
    confidenceScore  : { type: Number, min: 0, max: 100 },  // derived metric
    stressScore      : { type: Number, min: 0, max: 100 },
    engagementScore  : { type: Number, min: 0, max: 100 },
    composureScore   : { type: Number, min: 0, max: 100 },
    positivityScore  : { type: Number, min: 0, max: 100 },
    emotionStability : { type: Number, min: 0, max: 100 },
    peakStressMoments: [Date],
    emotionInsights  : [String],
  },

  // ── AI-Generated Report ───────────────────────────────────────────────────
  aiReport: {
    overallScore     : { type: Number, min: 0, max: 100 },
    communicationScore: Number,
    technicalScore   : Number,
    bodyLanguageScore: Number,
    summary          : String,
    strengths        : [String],
    areasOfImprovement: [String],
    recommendation   : { type: String, enum: ['strong-hire', 'hire', 'maybe', 'no-hire'] },
    generatedAt      : Date,
  },

  // Recruiter notes
  recruiterNotes: String,
  recruiterRating: { type: Number, min: 1, max: 5 },

  recordingUrl: String,
  transcript  : String,
}, { timestamps: true });

InterviewSchema.index({ candidate: 1, status: 1 });
InterviewSchema.index({ employer: 1, scheduledAt: -1 });
// InterviewSchema.index({ roomId: 1 });

module.exports = mongoose.model('Interview', InterviewSchema);