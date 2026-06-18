const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadAvatar }       = require('../middleware/upload.middleware');

router.use(protect);
router.get('/profile',  ctrl.getProfile);
router.put('/profile',  ctrl.updateProfile);
router.post('/avatar',  uploadAvatar, ctrl.uploadAvatar);
router.delete('/me',    ctrl.deactivateAccount);
router.get('/',         authorize('admin'), ctrl.getAllUsers);
router.get('/:id',      authorize('admin'), ctrl.getUserById);

module.exports = router;