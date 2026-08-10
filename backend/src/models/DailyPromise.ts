import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyPromise extends Document {
  date: string; // YYYY-MM-DD format
  verseTelugu: string;
  verseEnglish: string;
  referenceTelugu: string;
  referenceEnglish: string;
  addedBy: 'admin' | 'ai';
  createdAt: Date;
  updatedAt: Date;
}

const DailyPromiseSchema = new Schema<IDailyPromise>({
  date: { type: String, required: true, index: true },
  verseTelugu: { type: String, required: true },
  verseEnglish: { type: String, default: '' },
  referenceTelugu: { type: String, required: true },
  referenceEnglish: { type: String, default: '' },
  addedBy: { type: String, enum: ['admin', 'ai'], default: 'admin' },
}, { timestamps: true });

export const DailyPromise = mongoose.model<IDailyPromise>('DailyPromise', DailyPromiseSchema);
