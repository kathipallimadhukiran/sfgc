import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Song } from '../models/Song';
import { Event } from '../models/Event';
import { Notice } from '../models/Notice';
import { LiveState } from '../models/LiveState';
import { User } from '../models/User';
import { UserPlanProgress } from '../models/biblePlanModel';
import { seedInitialDatabase } from './seedData';
import { config } from '../config/config';

const cleanDatabase = async () => {
  try {
    console.log('🧹 Connecting to MongoDB to clean dummy data...');
    await connectDB();

    console.log('🗑️ Deleting all Users...');
    const deletedUsers = await User.deleteMany({});
    console.log(`✅ Deleted ${deletedUsers.deletedCount} users.`);

    console.log('🗑️ Deleting all Songs...');
    const deletedSongs = await Song.deleteMany({});
    console.log(`✅ Deleted ${deletedSongs.deletedCount} songs.`);

    console.log('🗑️ Deleting all Events...');
    const deletedEvents = await Event.deleteMany({});
    console.log(`✅ Deleted ${deletedEvents.deletedCount} events.`);

    console.log('🗑️ Deleting all Notices...');
    const deletedNotices = await Notice.deleteMany({});
    console.log(`✅ Deleted ${deletedNotices.deletedCount} notices.`);

    console.log('🗑️ Deleting all Leaderboard Progress...');
    const deletedProgress = await UserPlanProgress.deleteMany({});
    console.log(`✅ Deleted ${deletedProgress.deletedCount} progress records.`);

    console.log('🌱 Re-seeding initial user accounts...');
    await seedInitialDatabase();

    console.log('🔄 Resetting Live Stream session to inactive...');
    await LiveState.findOneAndUpdate(
      { key: 'active_session' },
      {
        $set: {
          isStreamingLive: false,
          song: null,
          currentSlideIndex: 0,
          highlightedLineIndex: -1,
        }
      },
      { upsert: true }
    );
    console.log('✅ Live Stream session reset successfully.');

    console.log('\n✨ Database clean-up and account seeding completed successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error cleaning database:', err);
    process.exit(1);
  }
};

cleanDatabase();
