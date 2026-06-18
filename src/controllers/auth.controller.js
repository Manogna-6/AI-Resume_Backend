const User = require('../models/User.model');
const jwt  = require('jsonwebtoken');

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken  = user.getSignedJwtToken();
  const refreshToken = user.getRefreshToken();
  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id        : user._id,
      firstName : user.firstName,
      lastName  : user.lastName,
      email     : user.email,
      role      : user.role,
      avatar    : user.avatar,
      isVerified: user.isVerified,
    },
  });
};

exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, company } = req.body;
    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    const user = await User.create({
      firstName, lastName, email, password,
      role: role || 'candidate',
      ...(role === 'employer' && company ? { company } : {}),
    });
    sendTokenResponse(user, 201, res);
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated.' });
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    sendTokenResponse(user, 200, res);
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token.' });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    res.status(200).json({ success: true, accessToken: user.getSignedJwtToken() });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = req.body.newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (err) { next(err); }
};

exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};