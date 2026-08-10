import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveVideo extends Document {
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  categoryId: string;
  thumbnail: string;
  createdAt: Date;
  updatedAt: Date;
}

const LiveVideoSchema = new Schema<ILiveVideo>({
  youtubeId: { type: String, required: true, unique: true, trim: true },
  youtubeUrl: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  categoryId: { type: String, required: true, default: 'sunday' },
  thumbnail: { type: String, required: true, trim: true },
}, {
  timestamps: true,
});

export const LiveVideo = mongoose.model<ILiveVideo>('LiveVideo', LiveVideoSchema);
