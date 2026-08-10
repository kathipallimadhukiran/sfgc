import { Request, Response, NextFunction } from 'express';
import { LiveVideo } from '../models/LiveVideo';

const extractYoutubeId = (url: string): string | null => {
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

    const video = await LiveVideo.create({
      youtubeId,
      youtubeUrl: youtubeUrl.trim(),
      title: title.trim(),
      categoryId: categoryId || 'sunday',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    });

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
