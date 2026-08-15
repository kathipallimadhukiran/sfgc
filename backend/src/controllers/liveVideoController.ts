import { Request, Response, NextFunction } from 'express';
import { LiveVideo } from '../models/LiveVideo';
import { Notice } from '../models/Notice';
import { LiveState } from '../models/LiveState';

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.includes('youtube.com/live/')) {
    const parts = trimmed.split('youtube.com/live/');
    if (parts[1]) {
      const id = parts[1].split('?')[0].split('&')[0];
      if (id && id.length === 11) return id;
    }
  }
  const match = trimmed.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|live\/|watch\?v=|&v=)([^#&?]{11})(?:[?#&].*)?$/i);
  return match && match[1] ? match[1] : null;
};

export const getLiveVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const videos = await LiveVideo.find().sort({ createdAt: -1 });
    const liveState = await LiveState.findOne({ key: 'active_session' });
    res.status(200).json({ 
      success: true, 
      videos, 
      channelId: liveState?.channelId || '',
      autoSyncEnabled: liveState?.autoSyncEnabled ?? true,
    });
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

// @route   POST /api/stream/videos/sync-channel
// @desc    100% Free Auto-Sync YouTube Channel videos directly via public RSS feed
export const syncYouTubeChannelVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { channelId, channelUrl } = req.body;
    let targetChannelId = channelId ? String(channelId).trim() : '';

    if (!targetChannelId && channelUrl) {
      if (channelUrl.includes('channel/UC')) {
        targetChannelId = channelUrl.split('channel/')[1].split('/')[0].split('?')[0];
      }
    }

    if (!targetChannelId) {
      res.status(400).json({ success: false, message: 'A valid YouTube Channel ID (e.g., UC...) is required.' });
      return;
    }

    // Save Channel ID permanently to LiveState so background polling job checks automatically
    await LiveState.findOneAndUpdate(
      { key: 'active_session' },
      { $set: { channelId: targetChannelId, autoSyncEnabled: true } },
      { upsert: true }
    );

    const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${targetChannelId}`;
    const rssResp = await fetch(rssFeedUrl);
    const xmlText = await rssResp.text();

    const entryMatches = xmlText.split('<entry>');
    let importedCount = 0;

    for (let i = 1; i < entryMatches.length; i++) {
      const entryStr = entryMatches[i];
      const videoIdMatch = entryStr.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
      const titleMatch = entryStr.match(/<title>(.*?)<\/title>/);

      if (videoIdMatch && videoIdMatch[1] && titleMatch && titleMatch[1]) {
        const yId = videoIdMatch[1].trim();
        const vTitle = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();

        const exists = await LiveVideo.findOne({ youtubeId: yId });
        if (!exists) {
          const newVideo = await LiveVideo.create({
            youtubeId: yId,
            youtubeUrl: `https://www.youtube.com/watch?v=${yId}`,
            title: vTitle,
            categoryId: 'sunday',
            thumbnail: `https://img.youtube.com/vi/${yId}/hqdefault.jpg`,
          });
          importedCount++;

          // Create push notice record for each newly fetched video
          try {
            const notice = await Notice.create({
              title: `🎬 ${vTitle}`,
              description: `New YouTube worship video published: "${vTitle}". Tap to watch in YouTube Videos!`,
              date: new Date().toISOString(),
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              location: 'YouTube Sanctuary Media',
              isPinned: true,
            });

            const io = req.app.get('io');
            if (io) {
              io.emit('newNotice', notice);
              io.emit('new_video_notification', {
                notificationId: notice._id.toString(),
                type: 'NEW_VIDEO',
                title: '🎬 New Worship Video Added',
                message: `New YouTube video: "${vTitle}"`,
                videoId: newVideo._id.toString(),
                youtubeVideoId: yId,
                thumbnail: newVideo.thumbnail,
                createdAt: new Date().toISOString(),
              });
            }
          } catch (nErr) {
            console.warn('Notice creation warning during YouTube channel sync:', nErr);
          }
        }
      }
    }

    const videos = await LiveVideo.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: `🎉 Saved YouTube Channel ID (${targetChannelId}) & synced ${importedCount} new videos! Automatic 24/7 background checking is active.`,
      channelId: targetChannelId,
      importedCount,
      videos,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to sync YouTube channel videos', error: error.message });
  }
};

// 24/7 Background YouTube Channel Auto-Sync Job (polls RSS feed every 3 minutes)
export const autoSyncChannelVideosJob = async (io?: any): Promise<number> => {
  try {
    const liveState = await LiveState.findOne({ key: 'active_session' });
    const targetChannelId = liveState?.channelId;
    if (!targetChannelId || liveState?.autoSyncEnabled === false) {
      return 0;
    }

    const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${targetChannelId}`;
    const rssResp = await fetch(rssFeedUrl);
    if (!rssResp.ok) return 0;
    const xmlText = await rssResp.text();

    const entryMatches = xmlText.split('<entry>');
    let importedCount = 0;

    for (let i = 1; i < entryMatches.length; i++) {
      const entryStr = entryMatches[i];
      const videoIdMatch = entryStr.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
      const titleMatch = entryStr.match(/<title>(.*?)<\/title>/);

      if (videoIdMatch && videoIdMatch[1] && titleMatch && titleMatch[1]) {
        const yId = videoIdMatch[1].trim();
        const vTitle = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();

        const exists = await LiveVideo.findOne({ youtubeId: yId });
        if (!exists) {
          const newVideo = await LiveVideo.create({
            youtubeId: yId,
            youtubeUrl: `https://www.youtube.com/watch?v=${yId}`,
            title: vTitle,
            categoryId: 'sunday',
            thumbnail: `https://img.youtube.com/vi/${yId}/hqdefault.jpg`,
          });
          importedCount++;

          try {
            const notice = await Notice.create({
              title: `🎬 ${vTitle}`,
              description: `New YouTube worship video published: "${vTitle}". Tap to watch in YouTube Videos!`,
              date: new Date().toISOString(),
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              location: 'YouTube Sanctuary Media',
              isPinned: true,
            });

            if (io) {
              io.emit('newNotice', notice);
              io.emit('new_video_notification', {
                notificationId: notice._id.toString(),
                type: 'NEW_VIDEO',
                title: '🎬 New Worship Video Added',
                message: `New YouTube video: "${vTitle}"`,
                videoId: newVideo._id.toString(),
                youtubeVideoId: yId,
                thumbnail: newVideo.thumbnail,
                createdAt: new Date().toISOString(),
              });
            }
          } catch (nErr) {
            console.warn('Notice creation warning during auto-sync job:', nErr);
          }
        }
      }
    }

    if (importedCount > 0) {
      console.log(`🎉 [AUTO_SYNC_JOB] Imported ${importedCount} new videos from YouTube channel ${targetChannelId}!`);
    }
    return importedCount;
  } catch (err: any) {
    console.error('❌ [AUTO_SYNC_JOB] Channel polling error:', err?.message || err);
    return 0;
  }
};
