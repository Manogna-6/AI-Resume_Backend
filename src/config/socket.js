const logger = require('./logger');

module.exports = (io) => {
  // ── Interview namespace ──────────────────────────────────────────────────
  const interviewNS = io.of('/interview');

  interviewNS.on('connection', (socket) => {
    logger.info(`[Socket] Interview client connected: ${socket.id}`);

    // Join an interview room (1 candidate + 1 recruiter)
    socket.on('join-room', ({ roomId, userId, role }) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { userId, role, socketId: socket.id });
      logger.info(`[Socket] User ${userId} (${role}) joined room ${roomId}`);
    });

    // WebRTC signalling: pass offer/answer/ICE candidates peer-to-peer
    socket.on('webrtc-offer', ({ roomId, offer, from }) => {
      socket.to(roomId).emit('webrtc-offer', { offer, from });
    });

    socket.on('webrtc-answer', ({ roomId, answer, from }) => {
      socket.to(roomId).emit('webrtc-answer', { answer, from });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate });
    });

    // Emotion data from frontend (sent every ~2s during interview)
    socket.on('emotion-frame', ({ roomId, emotionData, timestamp }) => {
      // Forward to recruiter in same room
      socket.to(roomId).emit('emotion-update', { emotionData, timestamp });
      // Persist snapshot via REST or DB write can happen here
    });

    // Interview control events
    socket.on('interview-start', ({ roomId, interviewId }) => {
      interviewNS.to(roomId).emit('interview-started', { interviewId, startedAt: new Date() });
    });

    socket.on('interview-end', ({ roomId, interviewId }) => {
      interviewNS.to(roomId).emit('interview-ended', { interviewId, endedAt: new Date() });
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket] Interview client disconnected: ${socket.id}`);
    });
  });

  // ── Notifications namespace ──────────────────────────────────────────────
  const notifNS = io.of('/notifications');

  notifNS.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(`user-${userId}`);
      logger.info(`[Socket] Notification client connected: userId=${userId}`);
    }

    socket.on('disconnect', () => {
      logger.info(`[Socket] Notification client disconnected: userId=${userId}`);
    });
  });

  // Helper to emit notification from anywhere in the app
  io.sendNotification = (userId, notification) => {
    notifNS.to(`user-${userId}`).emit('new-notification', notification);
  };
};