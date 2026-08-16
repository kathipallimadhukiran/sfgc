import { Request, Response, NextFunction } from 'express';
import { Notice } from '../models/Notice';
import { sendPushNotificationToAll } from '../services/pushNotificationService';

// @route   GET /api/notices
// @desc    Get all notices
export const getNotices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notices = await Notice.find().sort({ isPinned: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      count: notices.length,
      notices,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/notices/:id
// @desc    Get single notice by ID
export const getNoticeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      res.status(404).json({ success: false, message: 'Notice not found.' });
      return;
    }
    res.status(200).json({ success: true, notice });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/notices
// @desc    Create a new notice / announcement
export const createNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, date, time, location, image, attachment, isPinned } = req.body;

    if (!title || !description) {
      res.status(400).json({ success: false, message: 'Title and description are required.' });
      return;
    }

    const newNotice = await Notice.create({
      title: title.trim(),
      description: description.trim(),
      date: date || new Date().toISOString(),
      time: time || '',
      location: location || '',
      image: image || '',
      attachment: attachment || '',
      isPinned: Boolean(isPinned),
    });

    // Broadcast new notice alert to all connected mobile clients in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('newNotice', newNotice);
    }

    // Trigger Mobile System Push Notification to all devices
    const pushResult = await sendPushNotificationToAll(
      `📢 ${newNotice.title}`,
      newNotice.description,
      { type: 'notice', id: newNotice._id, imageUrl: newNotice.image },
      newNotice.image
    );

    res.status(201).json({
      success: true,
      message: 'Notice posted successfully.',
      notice: newNotice,
      pushResult,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/notices/:id
// @desc    Update a notice
export const updateNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updatedNotice = await Notice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedNotice) {
      res.status(404).json({ success: false, message: 'Notice not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notice updated successfully.',
      notice: updatedNotice,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/notices/:id
// @desc    Delete a notice
export const deleteNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) {
      res.status(404).json({ success: false, message: 'Notice not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/notices/:id/push
// @desc    Admin manually pushes notification for a notice to all users
export const pushNoticeNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      res.status(404).json({ success: false, message: 'Notice not found.' });
      return;
    }

    const imageUrl = notice.image || '';

    // Broadcast socket event
    const io = (req as any).app.get('io');
    if (io) {
      io.emit('newNotice', notice);
    }

    const pushResult = await sendPushNotificationToAll(
      `📢 ${notice.title}`,
      notice.description,
      {
        type: 'notice',
        id: notice._id.toString(),
        noticeId: notice._id.toString(),
        imageUrl: imageUrl,
      },
      imageUrl
    );

    res.status(200).json({
      success: true,
      message: `Notice notification pushed to all devices.`,
      pushResult,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/notices/test-push
// @desc    Send instant test push notification to all mobile devices
export const sendTestPush = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, body } = req.body;
    const alertTitle = title || '🔔 SFGC Sanctuary Push Notification Test';
    const alertBody = body || 'Praise God! Your mobile push notifications are working perfectly on SFGC App!';

    const result = await sendPushNotificationToAll(alertTitle, alertBody, { type: 'test' });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

