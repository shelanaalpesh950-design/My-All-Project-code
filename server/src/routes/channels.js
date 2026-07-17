import express from 'express';
import Channel from '../models/Channel.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all channels and DMs the user is a member of
// @route   GET /api/channels
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const channels = await Channel.find({
      members: { $in: [req.user._id] },
    })
      .populate('members', 'username email avatar status lastSeen')
      .populate('createdBy', 'username')
      .sort({ updatedAt: -1 });

    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a channel or DM room
// @route   POST /api/channels
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, description, isDM, recipientId } = req.body;

  try {
    if (isDM) {
      if (!recipientId) {
        return res.status(400).json({ message: 'Recipient ID is required for DMs' });
      }

      // Check if DM already exists between these users
      let existingDM = await Channel.findOne({
        isDM: true,
        members: { $all: [req.user._id, recipientId] },
      }).populate('members', 'username email avatar status lastSeen');

      if (existingDM) {
        return res.json(existingDM);
      }

      // Create new DM
      const newDM = await Channel.create({
        isDM: true,
        members: [req.user._id, recipientId],
        createdBy: req.user._id,
      });

      const populatedDM = await Channel.findById(newDM._id).populate(
        'members',
        'username email avatar status lastSeen'
      );
      return res.status(201).json(populatedDM);
    } else {
      if (!name) {
        return res.status(400).json({ message: 'Channel name is required' });
      }

      // Create a public/private channel
      // All users can join channels, but let's add the creator as the first member
      // For general channels, we can auto-include other users or let them join.
      // Let's add all users as members by default, or just add the creator.
      // To make it easy, we'll start with adding the creator, but also allow fetching it.
      // Wait, let's add the creator as the member, and later if other users want to join, they can.
      // Better yet, let's include the creator in members.
      const newChannel = await Channel.create({
        name,
        description: description || '',
        isDM: false,
        members: [req.user._id],
        createdBy: req.user._id,
      });

      const populatedChannel = await Channel.findById(newChannel._id)
        .populate('members', 'username email avatar status lastSeen')
        .populate('createdBy', 'username');

      res.status(201).json(populatedChannel);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Join a channel
// @route   POST /api/channels/:id/join
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channel.isDM) {
      return res.status(400).json({ message: 'Cannot join a direct message room' });
    }

    if (channel.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member of this channel' });
    }

    channel.members.push(req.user._id);
    await channel.save();

    const populatedChannel = await Channel.findById(channel._id)
      .populate('members', 'username email avatar status lastSeen')
      .populate('createdBy', 'username');

    res.json(populatedChannel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
