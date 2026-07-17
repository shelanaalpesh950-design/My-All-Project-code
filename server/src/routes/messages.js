import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import { protect } from '../middleware/auth.js';
import { uploadFileToCloud } from '../config/cloudinary.js';

const router = express.Router();

// Ensure public/uploads directory exists for fallback
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// @desc    Get all messages for a channel
// @route   GET /api/messages/:channelId
// @access  Private
router.get('/:channelId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ channel: req.params.channelId })
      .populate('sender', 'username email avatar status')
      .populate('reactions.user', 'username')
      .sort({ createdAt: 1 });

    // Mark messages as read by this user
    await Message.updateMany(
      { channel: req.params.channelId, readBy: { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Send a message (text or file attachment)
// @route   POST /api/messages
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
  const { channelId, content } = req.body;

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    let fileUrl = '';
    let fileType = '';

    if (req.file) {
      const uploadResult = await uploadFileToCloud(req.file.path);
      fileUrl = uploadResult.url;
      fileType = uploadResult.type;
    }

    const message = await Message.create({
      sender: req.user._id,
      channel: channelId,
      content: content || '',
      fileUrl,
      fileType,
      readBy: [req.user._id],
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username email avatar status')
      .populate('reactions.user', 'username');

    // Notify channel updated time (helpful for sidebar sorting)
    channel.updatedAt = Date.now();
    await channel.save();

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { content } = req.body;

  try {
    let message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this message' });
    }

    message.content = content || message.content;
    message.edited = true;
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username email avatar status')
      .populate('reactions.user', 'username');

    res.json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this message' });
    }

    await Message.deleteOne({ _id: req.params.id });
    res.json({ message: 'Message removed', messageId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    React to a message / Toggle emoji
// @route   POST /api/messages/:id/react
// @access  Private
router.post('/:id/react', protect, async (req, res) => {
  const { emoji } = req.body;

  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      // Remove reaction if exists (toggle off)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username email avatar status')
      .populate('reactions.user', 'username');

    res.json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Search for messages inside a channel
// @route   GET /api/messages/:channelId/search
// @access  Private
router.get('/:channelId/search', protect, async (req, res) => {
  const { query } = req.query;

  try {
    if (!query) {
      return res.json([]);
    }

    const messages = await Message.find({
      channel: req.params.channelId,
      $text: { $search: query },
    })
      .populate('sender', 'username email avatar status')
      .populate('reactions.user', 'username');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
