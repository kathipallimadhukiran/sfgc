import mongoose, { Document, Schema } from 'mongoose';

export interface ILyricSlide {
  type: string;
  text: string;
}

export interface ISong extends Document {
  title: string;
  language: 'Telugu' | 'English';
  category: string;
  tags: string[];
  youtubeLink?: string;
  chords?: string;
  lyrics: ILyricSlide[];
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const LyricSlideSchema = new Schema<ILyricSlide>({
  type: { type: String, required: true, default: 'Verse' },
  text: { type: String, required: true },
});

const SongSchema = new Schema<ISong>({
  title: { type: String, required: true, trim: true },
  language: { type: String, enum: ['Telugu', 'English'], required: true, default: 'English' },
  category: { type: String, required: true, default: 'Worship Songs' },
  tags: { type: [String], default: [] },
  youtubeLink: { type: String, default: '' },
  chords: { type: String, default: '' },
  lyrics: { type: [LyricSlideSchema], required: true, default: [] },
  viewsCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Text indexing for fast searching without language stemmer collision.
// 'language_override: lang_ignore' points to a non-existent field so MongoDB
// never tries to use the song's 'language' field (e.g. 'Telugu') as a stemmer
// language, which would throw error code 17262.
SongSchema.index(
  { title: 'text', category: 'text', tags: 'text', 'lyrics.text': 'text' },
  { default_language: 'none', language_override: 'lang_ignore' }
);

export const Song = mongoose.model<ISong>('Song', SongSchema);
