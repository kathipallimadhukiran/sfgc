import { Request, Response, NextFunction } from 'express';
import { LiveState } from '../models/LiveState';
import { Notice } from '../models/Notice';

// @route   GET /api/stream
// @desc    Get sanctuary live stream and projection state
export const getStreamState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let state = await LiveState.findOne({ key: 'active_session' });
    if (!state) {
      state = await LiveState.create({
        key: 'active_session',
        activeYoutubeLink: '',
        isStreamingLive: false,
      });
    }

    res.status(200).json({
      success: true,
      state,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/stream
// @desc    Update live stream broadcast link & settings
export const updateStreamState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { activeYoutubeLink, isStreamingLive } = req.body;

    if (
      activeYoutubeLink !== undefined &&
      activeYoutubeLink !== '' &&
      !/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11})(?:[?#&].*)?$/i.test(activeYoutubeLink)
    ) {
      res.status(400).json({ success: false, message: 'Please provide a valid YouTube video URL.' });
      return;
    }

    const state = await LiveState.findOneAndUpdate(
      { key: 'active_session' },
      { 
        $set: { 
          ...(activeYoutubeLink !== undefined ? { activeYoutubeLink } : {}),
          ...(isStreamingLive !== undefined ? { isStreamingLive } : {}),
        } 
      },
      { upsert: true, new: true }
    );

    if (isStreamingLive) {
      try {
        const newNotice = await Notice.create({
          title: '🔴 Church Live Worship is LIVE!',
          description: `Join us now for live church sanctuary worship and prayer.${activeYoutubeLink ? `\nWatch Link: ${activeYoutubeLink}` : ''}`,
          date: new Date().toISOString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: 'Online Sanctuary Stream',
          isPinned: true,
        });

        // Broadcast notice to connected clients
        const io = (req as any).app.get('io');
        if (io) {
          io.emit('newNotice', newNotice);
        }
      } catch (noticeErr) {
        console.log('Live stream notice creation ignored:', noticeErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Live stream broadcast status updated.',
      state,
    });
  } catch (error) {
    next(error);
  }
};
