import mongoose, { Document, Schema } from 'mongoose';

export interface INotice extends Document {
  title: string;
  description: string;
  date?: string;
  time?: string;
  location?: string;
  image?: string;
  attachment?: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date: { type: String, default: () => new Date().toISOString() },
  time: { type: String, default: '' },
  location: { type: String, default: '' },
  image: { type: String, default: '' },
  attachment: { type: String, default: '' },
  isPinned: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export const Notice = mongoose.model<INotice>('Notice', NoticeSchema);
