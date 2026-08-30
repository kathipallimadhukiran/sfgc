import { Request, Response, NextFunction } from 'express';
import os from 'os';
import { LiveState } from '../models/LiveState';
import { Notice } from '../models/Notice';
import { config } from '../config/config';
import { getConnectedDisplaysList } from '../sockets/liveLyricsSocket';

// @route   GET /api/stream/cast-info
// @desc    Get dynamic TV casting network endpoints, local IPs & connected Smart TV displays
export const getCastInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const interfaces = os.networkInterfaces();
    const physicalIps: string[] = [];
    const fallbackIps: string[] = [];
    const virtualKeywords = ['vethernet', 'virtualbox', 'vmware', 'wsl', 'docker', 'zerotier', 'host-only', 'loopback', 'hyper-v', 'npcap', 'vpn'];

    for (const name of Object.keys(interfaces)) {
      const lowerName = name.toLowerCase();
      const isVirtual = virtualKeywords.some((keyword) => lowerName.includes(keyword));

      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!isVirtual) {
            physicalIps.push(iface.address);
          } else {
            fallbackIps.push(iface.address);
          }
        }
      }
    }

    // Sort physical IPs prioritizing 192.168.x.x and 10.x.x.x
    physicalIps.sort((a, b) => {
      const isA = a.startsWith('192.168.') || a.startsWith('10.');
      const isB = b.startsWith('192.168.') || b.startsWith('10.');
      if (isA && !isB) return -1;
      if (!isA && isB) return 1;
      return 0;
    });

    const localIps = Array.from(new Set([...physicalIps, ...fallbackIps]));
    const hostIp = localIps[0] || 'localhost';
    const port = config.port || 5000;
    const tvWebUrl = `http://${hostIp}:${port}/tv.html`;
    const projectionUrl = `http://${hostIp}:${port}/#projection`;
    const connectedDisplays = getConnectedDisplaysList();

    res.status(200).json({
      success: true,
      hostIp,
      port,
      tvWebUrl,
      projectionUrl,
      localIps,
      connectedDisplays,
      pairingCode: `TV-${Math.floor(1000 + Math.random() * 9000)}`,
    });
  } catch (error) {
    next(error);
  }
};

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
      !/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|live\/|watch\?v=|&v=)([^#&?]{11})(?:[?#&].*)?$/i.test(activeYoutubeLink)
    ) {
      res.status(400).json({ success: false, message: 'Please provide a valid YouTube video or live URL.' });
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
