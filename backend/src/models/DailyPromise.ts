import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyPromise extends Document {
  date: string; // YYYY-MM-DD format
  bookId?: string;
  bookTelugu?: string;
  bookEnglish?: string;
  chapter?: number;
  verse?: number;
  verseTelugu: string;
  verseEnglish: string;
  referenceTelugu: string;
  referenceEnglish: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  notificationSentAt?: Date;
  addedBy: 'admin' | 'ai';
  createdAt: Date;
  updatedAt: Date;
}

const DailyPromiseSchema = new Schema<IDailyPromise>({
  date: { type: String, required: true, index: true },
  bookId: { type: String, default: '' },
  bookTelugu: { type: String, default: '' },
  bookEnglish: { type: String, default: '' },
  chapter: { type: Number, default: 1 },
  verse: { type: Number, default: 1 },
  verseTelugu: { type: String, required: true },
  verseEnglish: { type: String, default: '' },
  referenceTelugu: { type: String, required: true },
  referenceEnglish: { type: String, default: '' },
  status: { type: String, enum: ['scheduled', 'sent', 'cancelled'], default: 'scheduled' },
  notificationSentAt: { type: Date },
  addedBy: { type: String, enum: ['admin', 'ai'], default: 'admin' },
}, { timestamps: true });

export const DailyPromise = mongoose.model<IDailyPromise>('DailyPromise', DailyPromiseSchema);
