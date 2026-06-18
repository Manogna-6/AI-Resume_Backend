const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  firstName : { type: String, required: true, trim: true },
  lastName  : { type: String, required: true, trim: true },
  email     : { type: String, required: true, unique: true, lowercase: true, trim: true },
  password  : { type: String, required: true, minlength: 6, select: false },
  role      : { type: String, enum: ['candidate', 'employer', 'admin'], default: 'candidate' },
  avatar    : { type: String, default: null },
  phone     : { type: String, default: null },
  isActive  : { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  // Employer-specific
  company: {
    name    : String,
    website : String,
    industry: String,
    size    : String,
    logo    : String,
  },

  // Candidate-specific
  profile: {
    title      : String,
    summary    : String,
    location   : String,
    linkedIn   : String,
    github     : String,
    portfolio  : String,
    skills     : [String],
    experience : Number,   // years
  },

  // Tokens
  resetPasswordToken   : String,
  resetPasswordExpire  : Date,
  emailVerificationToken: String,

  lastLogin : { type: Date, default: null },
}, { timestamps: true });

// ── Hash password before save ──────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: match password ───────────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Instance method: generate access token ────────────────────────────────
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// ── Instance method: generate refresh token ───────────────────────────────
UserSchema.methods.getRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );
};

// ── Virtual: full name ─────────────────────────────────────────────────────
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', UserSchema);