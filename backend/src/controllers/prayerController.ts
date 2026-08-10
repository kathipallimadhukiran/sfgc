import { Request, Response, NextFunction } from 'express';
import { PrayerRequest } from '../models/PrayerRequest';
import { AuthRequest } from '../middleware/auth';

// @route   GET /api/prayers
// @desc    Get all public prayer requests
export const getPrayerRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prayers = await PrayerRequest.find({ isPrivate: { $ne: true } }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: prayers.length,
      prayers,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/prayers
// @desc    Submit a prayer request
export const createPrayerRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, prayer, category, isAnonymous, isPrivate } = req.body;

    if (!prayer || !prayer.trim()) {
      res.status(400).json({ success: false, message: 'Prayer request content is required.' });
      return;
    }

    const prayerDoc = await PrayerRequest.create({
      authorId: req.user?._id,
      name: isAnonymous ? 'Anonymous' : (name?.trim() || req.user?.name || 'Church Member'),
      prayer: prayer.trim(),
      category: category || 'General',
      isAnonymous: Boolean(isAnonymous),
      isPrivate: Boolean(isPrivate),
      status: 'Open',
      prayCount: 0,
      prayedBy: [],
    });

    res.status(201).json({
      success: true,
      message: 'Prayer request submitted. Our prayer team will lift this up.',
      prayer: prayerDoc,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/prayers/:id/pray
// @desc    Increment "I prayed for this" count
export const prayForRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id?.toString() || req.body.userId || 'anonymous_prayer';
    const prayer = await PrayerRequest.findById(req.params.id);

    if (!prayer) {
      res.status(404).json({ success: false, message: 'Prayer request not found.' });
      return;
    }

    if (!prayer.prayedBy.includes(userId)) {
      prayer.prayedBy.push(userId);
      prayer.prayCount = (prayer.prayCount || 0) + 1;
      await prayer.save();
    }

    res.status(200).json({
      success: true,
      prayCount: prayer.prayCount,
      message: 'Thank you for standing in prayer!',
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/prayers/:id/status
// @desc    Update prayer request status (e.g. mark Answered)
export const updatePrayerStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    const prayer = await PrayerRequest.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );

    if (!prayer) {
      res.status(404).json({ success: false, message: 'Prayer request not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Prayer status updated.',
      prayer,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/prayers/:id
// @desc    Delete a prayer request
export const deletePrayerRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prayer = await PrayerRequest.findByIdAndDelete(req.params.id);
    if (!prayer) {
      res.status(404).json({ success: false, message: 'Prayer request not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Prayer request deleted.',
    });
  } catch (error) {
    next(error);
  }
};
