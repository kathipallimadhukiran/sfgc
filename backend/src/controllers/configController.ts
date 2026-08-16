import { Request, Response, NextFunction } from 'express';
import { AppConfig } from '../models/AppConfig';
import { sendPushNotificationToAll } from '../services/pushNotificationService';

// @route   GET /api/config/app-version
// @desc    Get latest mobile app version & update status
export const getAppVersionConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let config = await AppConfig.findOne({ key: 'mobile_app_version' });
    if (!config) {
      config = await AppConfig.create({
        key: 'mobile_app_version',
        latestVersion: '1.0.0',
        minVersion: '1.0.0',
        forceUpdate: false,
        downloadUrl: 'https://sfgc-church.onrender.com',
        updateNotes: '🎉 SFGC Mobile App is up to date!',
      });
    }

    res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/config/app-version
// @desc    Update latest app version config & broadcast update alert to all devices (Admin)
export const updateAppVersionConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { latestVersion, minVersion, forceUpdate, downloadUrl, updateNotes, notifyUsers } = req.body;

    const config = await AppConfig.findOneAndUpdate(
      { key: 'mobile_app_version' },
      {
        $set: {
          ...(latestVersion ? { latestVersion: latestVersion.trim() } : {}),
          ...(minVersion ? { minVersion: minVersion.trim() } : {}),
          ...(forceUpdate !== undefined ? { forceUpdate: Boolean(forceUpdate) } : {}),
          ...(downloadUrl ? { downloadUrl: downloadUrl.trim() } : {}),
          ...(updateNotes ? { updateNotes: updateNotes.trim() } : {}),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Notify connected mobile clients via Socket.IO
    const io = (req as any).app.get('io');
    if (io) {
      io.emit('appVersionUpdated', config);
    }

    // Optionally send push notification to all users about new app update
    if (notifyUsers) {
      sendPushNotificationToAll(
        `🚀 New App Update Available (v${config.latestVersion})`,
        `Tap to update SFGC App to the latest version for new features and improvements!`,
        { type: 'app_update', version: config.latestVersion, url: config.downloadUrl }
      );
    }

    res.status(200).json({
      success: true,
      message: `🎉 App version config updated to v${config.latestVersion}!`,
      config,
    });
  } catch (error) {
    next(error);
  }
};
