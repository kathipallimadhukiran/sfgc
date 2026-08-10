import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyPortion {
  day: number;
  book: string;
  bookTelugu: string;
  startChapter: number;
  endChapter: number;
  startVerse?: number;
  endVerse?: number;
  versesSummary: string;
}

export interface IBiblePlan extends Document {
  planId: string;
  titleTelugu: string;
  titleEnglish: string;
  descriptionTelugu: string;
  descriptionEnglish: string;
  durationDays: number;
  category: 'canonical' | 'chronological' | 'testament' | 'custom';
  dailyPortions: IDailyPortion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DailyPortionSchema = new Schema<IDailyPortion>({
  day: { type: Number, required: true },
  book: { type: String, required: true },
  bookTelugu: { type: String, required: true },
  startChapter: { type: Number, required: true },
  endChapter: { type: Number, required: true },
  startVerse: { type: Number },
  endVerse: { type: Number },
  versesSummary: { type: String, required: true },
}, { _id: false });

const BiblePlanSchema = new Schema<IBiblePlan>({
  planId: { type: String, required: true, unique: true, index: true },
  titleTelugu: { type: String, required: true },
  titleEnglish: { type: String, required: true },
  descriptionTelugu: { type: String, default: '' },
  descriptionEnglish: { type: String, default: '' },
  durationDays: { type: Number, required: true },
  category: { type: String, default: 'canonical' },
  dailyPortions: [DailyPortionSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export interface IUserPlanProgress extends Document {
  userId: string;
  userName: string;
  planId: string;
  currentDay: number;
  completedDays: number[];
  readMarkedDays: number[]; // Days marked as read before quiz
  startDate: Date;
  targetEndDate: Date;
  streak: number;
  highestStreak: number;
  averageScore: number;
  totalQuizzes: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  lastCompletedDate?: Date;
  dailyAttempts: Record<string, number>; // "day-1": 2 (attempts used)
  quizScores: Record<string, number>; // "day-1": 100
  quizTimes: Record<string, number>; // "day-1": 45 (seconds)
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

const UserPlanProgressSchema = new Schema<IUserPlanProgress>({
  userId: { type: String, required: true, index: true },
  userName: { type: String, default: 'Member' },
  planId: { type: String, required: true, index: true },
  currentDay: { type: Number, default: 1 },
  completedDays: [{ type: Number }],
  readMarkedDays: [{ type: Number }],
  startDate: { type: Date, default: Date.now },
  targetEndDate: { type: Date },
  streak: { type: Number, default: 0 },
  highestStreak: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  totalQuizzes: { type: Number, default: 0 },
  totalTimeSeconds: { type: Number, default: 0 },
  averageTimeSeconds: { type: Number, default: 0 },
  lastCompletedDate: { type: Date },
  dailyAttempts: { type: Map, of: Number, default: {} },
  quizScores: { type: Map, of: Number, default: {} },
  quizTimes: { type: Map, of: Number, default: {} },
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
}, { timestamps: true });

// Compound index for single plan per user
UserPlanProgressSchema.index({ userId: 1, planId: 1 }, { unique: true });

export const BiblePlan = mongoose.model<IBiblePlan>('BiblePlan', BiblePlanSchema);
export const UserPlanProgress = mongoose.model<IUserPlanProgress>('UserPlanProgress', UserPlanProgressSchema);
