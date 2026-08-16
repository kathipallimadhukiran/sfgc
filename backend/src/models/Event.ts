import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  banner?: string;
  speaker?: string;
  venue: string;
  date: string;
  time?: string;
  mapsLocation?: string;
  description?: string;
  requiresRSVP?: boolean;
  rsvps: string[];
  notified2hBefore?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true, trim: true },
  banner: { type: String, default: '' },
  speaker: { type: String, default: '' },
  venue: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  time: { type: String, default: '' },
  mapsLocation: { type: String, default: '' },
  description: { type: String, default: '' },
  requiresRSVP: { type: Boolean, default: false },
  rsvps: { type: [String], default: [] },
  notified2hBefore: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export const Event = mongoose.model<IEvent>('Event', EventSchema);
