import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Song } from '../models/Song';
import { Event } from '../models/Event';
import { Notice } from '../models/Notice';
import { PrayerRequest } from '../models/PrayerRequest';
import { LiveState } from '../models/LiveState';
import { config } from '../config/config';

export const seedInitialDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding initial church data into MongoDB...');

      // Seed Default Administrator
      await User.create({
        name: 'Church Administrator',
        email: 'admin@SFGC.org',
        password: 'admin123',
        role: 'Admin',
        familyName: 'Church Leadership Family',
        location: 'Main Sanctuary',
        mobileNumber: '+91 9876543210',
        familyHeadName: 'Church Administrator',
        familyMembersCount: 1,
        ministry: 'Administration & Media',
        departments: ['Media Team', 'Worship Team', "Children's Ministry"],
        assignments: [
          {
            title: 'Sunday Worship Service Tech Lead',
            role: 'Sound & Projection Lead',
            date: new Date(Date.now() + 86400000 * 2).toISOString(),
            department: 'Media Team',
            status: 'Assigned',
            assignedBy: 'System',
            createdAt: new Date(),
          }
        ],
        favorites: []
      });

      // Seed Demo Member
      await User.create({
        name: 'John Wesley',
        email: 'member@SFGC.org',
        password: 'member123',
        role: 'Member',
        familyName: 'Wesley Blessed Family',
        location: 'Church Town, Sector 4',
        mobileNumber: '+91 9876543211',
        familyHeadName: 'John Wesley',
        familyMembersCount: 4,
        birthday: '1992-05-15',
        baptismDate: '2010-08-20',
        ministry: 'Choir & Worship',
        departments: ['Choir', "Children's Ministry"],
        assignments: [
          {
            title: 'Sunday Morning Choir Vocals',
            role: 'Lead Vocalist (Telugu/English)',
            date: new Date(Date.now() + 86400000 * 2).toISOString(),
            department: 'Choir',
            status: 'Confirmed',
            assignedBy: 'Church Administrator',
            createdAt: new Date(),
          }
        ],
        favorites: []
      });
      console.log('✅ Seeded default Admin and Member accounts.');
    }

    // LiveState Session
    const liveState = await LiveState.findOne({ key: 'active_session' });
    if (!liveState) {
      await LiveState.create({
        key: 'active_session',
        activeYoutubeLink: '',
        isStreamingLive: false,
      });
    } else if (liveState.activeYoutubeLink === 'https://www.youtube.com/watch?v=q72x53zRk_k') {
      // Remove the former development-only stream URL from existing databases.
      liveState.activeYoutubeLink = '';
      await liveState.save();
    }

  } catch (err: any) {
    console.warn('⚠️ Seeding error:', err.message);
  }
};
