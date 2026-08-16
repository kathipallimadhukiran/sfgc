import mongoose, { Document, Schema } from 'mongoose';

export interface IAppConfig extends Document {
  key: string;
  latestVersion: string;
  minVersion: string;
  forceUpdate: boolean;
  downloadUrl: string;
  updateNotes: string;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>({
  key: { type: String, required: true, unique: true, default: 'mobile_app_version' },
  latestVersion: { type: String, default: '1.0.1' },
  minVersion: { type: String, default: '1.0.0' },
  forceUpdate: { type: Boolean, default: false },
  downloadUrl: { type: String, default: 'https://sfgc-church.onrender.com' },
  updateNotes: { type: String, default: '🎉 New version available with enhanced push notifications, sanctuary live stream updates, and bug fixes!' },
}, { timestamps: true });

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
