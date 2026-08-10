import mongoose, { Document, Schema } from 'mongoose';

export interface IPrayerRequest extends Document {
  authorId?: mongoose.Types.ObjectId;
  name: string;
  prayer: string;
  category?: string;
  isAnonymous: boolean;
  isPrivate: boolean;
  status: 'Open' | 'Answered' | 'Archived';
  prayCount: number;
  prayedBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PrayerRequestSchema = new Schema<IPrayerRequest>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, default: 'Church Member' },
  prayer: { type: String, required: true, trim: true },
  category: { type: String, default: 'General' },
  isAnonymous: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  status: { type: String, enum: ['Open', 'Answered', 'Archived'], default: 'Open' },
  prayCount: { type: Number, default: 0 },
  prayedBy: { type: [String], default: [] },
}, {
  timestamps: true,
});

export const PrayerRequest = mongoose.model<IPrayerRequest>('PrayerRequest', PrayerRequestSchema);
