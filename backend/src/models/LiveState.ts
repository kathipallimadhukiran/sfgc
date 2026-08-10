import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveState extends Document {
  key: string;
  song?: any;
  currentSlideIndex: number;
  highlightedLineIndex: number;
  blackScreen: boolean;
  blankScreen: boolean;
  activeYoutubeLink: string;
  isStreamingLive: boolean;
  startedAt?: Date;
  updatedAt: Date;
}

const LiveStateSchema = new Schema<ILiveState>({
  key: { type: String, required: true, unique: true, default: 'active_session' },
  song: { type: Schema.Types.Mixed, default: null },
  currentSlideIndex: { type: Number, default: 0 },
  highlightedLineIndex: { type: Number, default: -1 },
  blackScreen: { type: Boolean, default: false },
  blankScreen: { type: Boolean, default: false },
  activeYoutubeLink: { type: String, default: '' },
  isStreamingLive: { type: Boolean, default: false },
  startedAt: { type: Date },
}, {
  timestamps: true,
});

export const LiveState = mongoose.model<ILiveState>('LiveState', LiveStateSchema);
