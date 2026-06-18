const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');

// ── Resume upload storage ──────────────────────────────────────────────────
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/resumes/'),
  filename   : (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume-${req.user.id}-${uuidv4()}${ext}`);
  },
});

const resumeFilter = (req, file, cb) => {
  const allowed = ['application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed for resumes.'), false);
  }
};

exports.uploadResume = multer({
  storage : resumeStorage,
  fileFilter: resumeFilter,
  limits  : { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
}).single('resume');

// ── Video frame upload (for emotion analysis snapshots) ───────────────────
const videoStorage = multer.memoryStorage(); // Keep in memory for processing

exports.uploadVideoFrame = multer({
  storage   : videoStorage,
  limits    : { fileSize: 5 * 1024 * 1024 },
}).single('frame');

// ── Avatar upload ──────────────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/temp/'),
  filename   : (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uuidv4()}${ext}`);
  },
});

exports.uploadAvatar = multer({
  storage   : avatarStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed for avatars.'), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('avatar');