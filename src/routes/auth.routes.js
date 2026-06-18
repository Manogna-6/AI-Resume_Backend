const express = require('express');
const router  = express.Router();
const { register, login, getMe, refreshToken, updatePassword, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register',       register);
router.post('/login',          login);
router.post('/refresh',        refreshToken);
router.post('/logout',         protect, logout);
router.get('/me',              protect, getMe);
router.put('/update-password', protect, updatePassword);

module.exports = router;