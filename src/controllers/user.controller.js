const User  = require('../models/User.model');
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

exports.getProfile = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'profile', 'company'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload an image.' });
    const outputPath = path.join('uploads', 'temp', 'avatar-' + req.user.id + '.jpg');
    await sharp(req.file.path).resize(200, 200).jpeg({ quality: 80 }).toFile(outputPath);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: '/' + outputPath.replace(/\\/g, '/') },
      { new: true }
    );
    res.status(200).json({ success: true, data: { avatar: user.avatar } });
  } catch (err) { next(err); }
};

exports.deactivateAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    res.status(200).json({ success: true, message: 'Account deactivated.' });
  } catch (err) { next(err); }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(query);
    res.status(200).json({ success: true, count: users.length, total, data: users });
  } catch (err) { next(err); }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};