import { Request, Response, NextFunction } from 'express';
import { LiveVideo } from '../models/LiveVideo';
import { Notice } from '../models/Notice';

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return match && match[1].length === 11 ? match[1] : null;
};

export const getLiveVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const videos = await LiveVideo.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, videos });
  } catch (error) {
    next(error);
  }
};

export const createLiveVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { youtubeUrl, title, categoryId } = req.body;
    const youtubeId = typeof youtubeUrl === 'string' ? extractYoutubeId(youtubeUrl.trim()) : null;

    if (!youtubeId || !title?.trim()) {
      res.status(400).json({ success: false, message: 'A valid YouTube URL and title are required.' });
      return;
    }

    // 1. Save video to MongoDB FIRST
    const video = await LiveVideo.create({
      youtubeId,
      youtubeUrl: youtubeUrl.trim(),
      title: title.trim(),
      categoryId: categoryId || 'sunday',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    });

    // 2. ONLY AFTER MongoDB save succeeds: Create notification & trigger socket event
    let notice = null;
    try {
      notice = await Notice.create({
        title: `🎬 ${video.title}`,
        description: `New YouTube worship video available: "${video.title}"`,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: 'YouTube Sanctuary Media',
        isPinned: false,
      });
    } catch (nErr) {
      console.warn('⚠️ Could not save notice record for video:', nErr);
    }

    const io = req.app.get('io');
    if (io) {
      const payload = {
        notificationId: notice ? notice._id.toString() : `vid_notif_${video._id}`,
        type: 'NEW_VIDEO',
        title: 'New Video Added',
        message: `New YouTube video added: "${video.title}"`,
        videoId: video._id.toString(),
        youtubeVideoId: video.youtubeId,
        thumbnail: video.thumbnail,
        createdAt: video.createdAt ? video.createdAt.toISOString() : new Date().toISOString(),
      };
      
      // Broadcast specific video notification event
      io.emit('new_video_notification', payload);
      
      if (notice) {
        io.emit('newNotice', notice);
      }
    }

    res.status(201).json({ success: true, video });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ success: false, message: 'This YouTube video has already been added.' });
      return;
    }
    next(error);
  }
};

export const deleteLiveVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const video = await LiveVideo.findByIdAndDelete(req.params.id);
    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found.' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const updateLiveVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, categoryId } = req.body;
    const video = await LiveVideo.findByIdAndUpdate(
      req.params.id,
      {
        ...(title ? { title: title.trim() } : {}),
        ...(categoryId ? { categoryId: categoryId.trim() } : {}),
      },
      { new: true }
    );
    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found.' });
      return;
    }
    res.status(200).json({ success: true, video });
  } catch (error) {
    next(error);
  }
};

