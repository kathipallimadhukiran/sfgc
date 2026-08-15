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
    const rawVideos = await LiveVideo.find().sort({ createdAt: -1 });
    const liveState = await LiveState.findOne({ key: 'active_session' });

    const formattedVideos = rawVideos.map(v => ({
      _id: v._id,
      videoId: v.youtubeId,
      youtubeId: v.youtubeId,
      title: v.title,
      description: v.description || v.title,
      thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`,
      publishedAt: v.publishedAt || v.createdAt,
      youtubeUrl: v.youtubeUrl || `https://www.youtube.com/watch?v=${v.youtubeId}`,
      isLive: v.isLive || false,
      categoryId: v.categoryId || 'sunday',
      createdAt: v.createdAt,
    }));

    res.status(200).json({ 
      success: true, 
      videos: formattedVideos, 
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

const decodeXmlEntities = (str: string): string => {
  return str
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026/g, '&')
    .replace(/\\"/g, '"')
    .trim();
};

const resolveChannelId = async (input: string): Promise<string | null> => {
  if (!input) return null;
  let raw = input.trim();

  // 1. Direct UC ID matching (24 characters starting with UC)
  if (/^UC[\w-]{22}$/.test(raw)) {
    return raw;
  }

  // 2. Extract from URL containing channel/UC...
  if (raw.includes('channel/UC')) {
    const match = raw.match(/channel\/(UC[\w-]{22})/);
    if (match && match[1]) return match[1];
  }

  // 3. Extract from video URL /watch?v= or /live/ by fetching video page HTML
  if (raw.includes('watch?v=') || raw.includes('youtu.be/') || raw.includes('youtube.com/live/')) {
    const vId = extractYoutubeId(raw);
    if (vId) {
      try {
        const vResp = await fetch(`https://www.youtube.com/watch?v=${vId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (vResp.ok) {
          const vHtml = await vResp.text();
          const match = vHtml.match(/(?:channel_id=|"channelId":"|"externalId":"|"browseId":")(UC[\w-]{22})/);
          if (match && match[1]) return match[1];
        }
      } catch (err) {
        console.warn('Could not extract channelId from video page:', err);
      }
    }
  }

  // 4. Handle handle URL, custom handle @name or username
  let targetUrl = raw;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    if (targetUrl.startsWith('@')) {
      targetUrl = `https://www.youtube.com/${targetUrl}`;
    } else {
      targetUrl = `https://www.youtube.com/@${targetUrl}`;
    }
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (resp.ok) {
      const html = await resp.text();
      const match = html.match(/(?:channel_id=|"channelId":"|"externalId":"|"browseId":")(UC[\w-]{22})/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (err) {
    console.warn('Could not resolve YouTube handle HTML:', err);
  }

  return null;
};

interface ExtractedVideo {
  youtubeId: string;
  title: string;
}

const fetchLatestChannelVideos = async (channelId: string): Promise<ExtractedVideo[]> => {
  const foundVideosMap = new Map<string, string>();

  // Engine 1: YouTube Public RSS Feed with Cache Busting
  try {
    const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}&nocache=${Date.now()}`;
    const rssResp = await fetch(rssFeedUrl, {
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' }
    });
    if (rssResp.ok) {
      const xmlText = await rssResp.text();
      const entryMatches = xmlText.split('<entry>');
      for (let i = 1; i < entryMatches.length; i++) {
        const entryStr = entryMatches[i];
        const videoIdMatch = entryStr.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
        const titleMatch = entryStr.match(/<title>(.*?)<\/title>/);
        if (videoIdMatch && videoIdMatch[1] && titleMatch && titleMatch[1]) {
          const yId = videoIdMatch[1].trim();
          const vTitle = decodeXmlEntities(titleMatch[1]);
          if (yId.length === 11) {
            foundVideosMap.set(yId, vTitle);
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Engine 1 RSS fetch warning:', err);
  }

  // Engine 2: Instant Channel HTML Scraper (/videos, /streams, /live, and main page)
  const tabs = [
    `https://www.youtube.com/channel/${channelId}/videos`,
    `https://www.youtube.com/channel/${channelId}/streams`,
    `https://www.youtube.com/channel/${channelId}/live`,
    `https://www.youtube.com/channel/${channelId}`,
  ];

  for (const pageUrl of tabs) {
    try {
      const pageResp = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        }
      });
      if (pageResp.ok) {
        const html = await pageResp.text();

        // 2a. Match gridVideoRenderer, videoRenderer, compactVideoRenderer, reelItemRenderer blocks
        const blockSplit = html.split(/"(?:gridVideoRenderer|videoRenderer|compactVideoRenderer|reelItemRenderer)":\{/);
        for (let i = 1; i < blockSplit.length; i++) {
          const block = blockSplit[i].substring(0, 1500);
          const idMatch = block.match(/"videoId":"([^"]{11})"/);
          if (idMatch && idMatch[1]) {
            const yId = idMatch[1].trim();

            let rawTitle = 'Sanctuary Worship Video';
            const titleMatch = block.match(/"title":\{.*?"text":"([^"]+)"/);
            const simpleMatch = block.match(/"title":\{.*?"simpleText":"([^"]+)"/);

            if (titleMatch && titleMatch[1]) {
              rawTitle = titleMatch[1];
            } else if (simpleMatch && simpleMatch[1]) {
              rawTitle = simpleMatch[1];
            }

            const vTitle = decodeXmlEntities(rawTitle);
            if (yId.length === 11 && (!foundVideosMap.has(yId) || foundVideosMap.get(yId)?.includes('('))) {
              foundVideosMap.set(yId, vTitle);
            }
          }
        }

        // 2b. Match all videoId strings in the page HTML as fallback
        const videoIdMatches = html.match(/"videoId":"([^"]{11})"/g);
        if (videoIdMatches) {
          for (const vm of videoIdMatches) {
            const yId = vm.replace(/"videoId":"|"/g, '').trim();
            if (yId.length === 11 && !foundVideosMap.has(yId)) {
              foundVideosMap.set(yId, `Sanctuary Worship Service (${yId})`);
            }
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Engine 2 HTML scrape warning:', err);
    }
  }

  const results: ExtractedVideo[] = [];
  foundVideosMap.forEach((title, youtubeId) => {
    results.push({ youtubeId, title });
  });

  return results;
};

// @route   POST /api/stream/videos/sync-channel
// @desc    100% Free Dual-Engine Auto-Sync YouTube Channel videos
export const syncYouTubeChannelVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { channelId, channelUrl } = req.body;
    const rawInput = (channelId || channelUrl || '').trim();

    if (!rawInput) {
      res.status(400).json({ success: false, message: 'A YouTube Channel ID, Channel URL, or Handle (@name) is required.' });
      return;
    }

    const targetChannelId = await resolveChannelId(rawInput);

    if (!targetChannelId) {
      res.status(400).json({
        success: false,
        message: `Could not resolve a valid YouTube Channel ID from "${rawInput}". Please enter your 24-character Channel ID starting with UC.`
      });
      return;
    }

    // Save resolved Channel ID permanently to LiveState so 24/7 background job checks automatically
    await LiveState.findOneAndUpdate(
      { key: 'active_session' },
      { $set: { channelId: targetChannelId, autoSyncEnabled: true } },
      { upsert: true }
    );

    const fetchedVideos = await fetchLatestChannelVideos(targetChannelId);
    let importedCount = 0;

    for (const vItem of fetchedVideos) {
      const exists = await LiveVideo.findOne({ youtubeId: vItem.youtubeId });
      if (!exists) {
        const newVideo = await LiveVideo.create({
          youtubeId: vItem.youtubeId,
          youtubeUrl: `https://www.youtube.com/watch?v=${vItem.youtubeId}`,
          title: vItem.title,
          categoryId: 'sunday',
          thumbnail: `https://img.youtube.com/vi/${vItem.youtubeId}/hqdefault.jpg`,
        });
        importedCount++;

        // Create notice & broadcast socket push notification
        try {
          const notice = await Notice.create({
            title: `🎬 ${vItem.title}`,
            description: `New YouTube worship video published: "${vItem.title}". Tap to watch in YouTube Videos!`,
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
              message: `New YouTube video: "${vItem.title}"`,
              videoId: newVideo._id.toString(),
              youtubeVideoId: vItem.youtubeId,
              thumbnail: newVideo.thumbnail,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (nErr) {
          console.warn('Notice creation warning during YouTube channel sync:', nErr);
        }
      }
    }

    const videos = await LiveVideo.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: `🎉 Saved Channel ID (${targetChannelId})! Synced ${importedCount} new videos. Automatic 24/7 background checking is ACTIVE!`,
      channelId: targetChannelId,
      importedCount,
      videos,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to sync YouTube channel videos', error: error.message });
  }
};

// 24/7 Background YouTube Channel Auto-Sync Job (polls every 30 seconds)
export const autoSyncChannelVideosJob = async (io?: any): Promise<number> => {
  try {
    const liveState = await LiveState.findOne({ key: 'active_session' });
    const targetChannelId = liveState?.channelId;
    if (!targetChannelId || liveState?.autoSyncEnabled === false) {
      return 0;
    }

    const fetchedVideos = await fetchLatestChannelVideos(targetChannelId);
    let importedCount = 0;

    for (const vItem of fetchedVideos) {
      const exists = await LiveVideo.findOne({ youtubeId: vItem.youtubeId });
      if (!exists) {
        const newVideo = await LiveVideo.create({
          youtubeId: vItem.youtubeId,
          youtubeUrl: `https://www.youtube.com/watch?v=${vItem.youtubeId}`,
          title: vItem.title,
          categoryId: 'sunday',
          thumbnail: `https://img.youtube.com/vi/${vItem.youtubeId}/hqdefault.jpg`,
        });
        importedCount++;

        try {
          const notice = await Notice.create({
            title: `🎬 ${vItem.title}`,
            description: `New YouTube worship video published: "${vItem.title}". Tap to watch in YouTube Videos!`,
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
              message: `New YouTube video: "${vItem.title}"`,
              videoId: newVideo._id.toString(),
              youtubeVideoId: vItem.youtubeId,
              thumbnail: newVideo.thumbnail,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (nErr) {
          console.warn('Notice creation warning during auto-sync job:', nErr);
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
