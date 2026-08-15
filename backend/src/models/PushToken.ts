import mongoose, { Document, Schema } from 'mongoose';

export interface IPushToken extends Document {
  token: string;
  userId?: string;
  platform?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>({
  token: { type: String, required: true, unique: true, trim: true },
  userId: { type: String, default: '' },
  platform: { type: String, default: 'mobile' },
}, { timestamps: true });

export const PushToken = mongoose.model<IPushToken>('PushToken', PushTokenSchema);
