import User from '../models/User.js';

// Map to track user ID to active socket IDs
const userSockets = new Map();

export const socketHandler = (io) => {
  io.on('connection', (socket) => {
    let currentUserId = null;

    // Register user when they connect
    socket.on('register-user', async (userId) => {
      if (!userId) return;
      currentUserId = userId;
      userSockets.set(userId, socket.id);

      // Join a private room for self-signaling/notifications
      socket.join(userId);

      // Update user status to online
      try {
        await User.findByIdAndUpdate(userId, { status: 'online' });
        io.emit('user-presence', { userId, status: 'online' });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    });

    // Join channel/room
    socket.on('join-channel', (channelId) => {
      if (!channelId) return;
      socket.join(channelId);
    });

    // Leave channel/room
    socket.on('leave-channel', (channelId) => {
      if (!channelId) return;
      socket.leave(channelId);
    });

    // Broadcast message events (when message is sent via REST, the client will broadcast it)
    socket.on('new-message', (message) => {
      if (!message || !message.channel) return;
      // Broadcast to everyone in the channel including sender
      io.to(message.channel).emit('message-received', message);
    });

    // Typing indicators
    socket.on('typing', ({ channelId, username }) => {
      socket.to(channelId).emit('user-typing', { channelId, username });
    });

    socket.on('stop-typing', ({ channelId, username }) => {
      socket.to(channelId).emit('user-stop-typing', { channelId, username });
    });

    // Message updates (edited/deleted/reacted)
    socket.on('message-updated', (message) => {
      if (!message || !message.channel) return;
      socket.to(message.channel).emit('message-updated-received', message);
    });

    socket.on('message-deleted', ({ channelId, messageId }) => {
      socket.to(channelId).emit('message-deleted-received', { messageId });
    });

    // --- WebRTC 1-on-1 Audio/Video Calling Signalling ---
    // User initiates a call to another user
    socket.on('call-user', ({ userToCall, signalData, from, name }) => {
      const recipientSocketId = userSockets.get(userToCall);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incoming-call', {
          signal: signalData,
          from,
          name,
        });
      } else {
        socket.emit('call-failed', { message: 'User is currently offline' });
      }
    });

    // Recipient accepts the call
    socket.on('answer-call', ({ signal, to }) => {
      const callerSocketId = userSockets.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call-accepted', signal);
      }
    });

    // Exchange ICE candidates (if doing native RTCPeerConnection signaling manually)
    socket.on('ice-candidate', ({ candidate, to }) => {
      const peerSocketId = userSockets.get(to);
      if (peerSocketId) {
        io.to(peerSocketId).emit('ice-candidate-received', candidate);
      }
    });

    // End call
    socket.on('end-call', ({ to }) => {
      const peerSocketId = userSockets.get(to);
      if (peerSocketId) {
        io.to(peerSocketId).emit('call-ended');
      }
    });

    // User disconnects
    socket.on('disconnect', async () => {
      if (currentUserId) {
        userSockets.delete(currentUserId);
        try {
          await User.findByIdAndUpdate(currentUserId, {
            status: 'offline',
            lastSeen: new Date(),
          });
          io.emit('user-presence', { userId: currentUserId, status: 'offline', lastSeen: new Date() });
        } catch (err) {
          console.error('Error updating presence on disconnect:', err);
        }
      }
    });
  });
};
