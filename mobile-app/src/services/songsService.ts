import { mongoService } from './mongoService';
import { apiClient } from './apiClient';

export interface LyricSlide {
  type: string;
  text: string;
}

export interface SongItem {
  _id?: string;
  id?: string;
  title: string;
  language: 'Telugu' | 'English';
  category: string;
  tags?: string[];
  youtubeLink?: string;
  chords?: string;
  lyrics: LyricSlide[];
  viewsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION = 'songs';

const INITIAL_SEED_SONGS: SongItem[] = [];

class SongsService {
  private initialized = false;

 
  // Get all songs: Fetch from Backend API with local fallback
  async getSongs(language?: string, search?: string): Promise<{ success: boolean; songs: SongItem[] }> {
    try {
      // 1. Attempt backend fetch
      try {
        let endpoint = '/api/songs';
        const params: string[] = [];
        if (language && language !== 'All') params.push(`language=${encodeURIComponent(language)}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (params.length > 0) endpoint += `?${params.join('&')}`;

        const res = await apiClient.get(endpoint);
        if (res.success && Array.isArray(res.songs)) {
          // Sync with local collection
          await mongoService.setLocalCollection(COLLECTION, res.songs);
          return res;
        }
      } catch (networkErr) {
        console.log('Backend songs API unreachable, loading from local DB');
      }

      // 2. Local Fallback
      const query: any = {};
      if (language && language !== 'All') query.language = language;

      const songs = await mongoService.find(COLLECTION, {
        filter: query,
        sort: { createdAt: -1 }
      });
      const realSongs = songs.filter(
        (s: any) => !String(s._id || s.id || '').startsWith('seed_')
      );
      return { success: true, songs: realSongs };
    } catch (err) {
      console.error('Error fetching songs:', err);
      return { success: true, songs: [] };
    }
  }

  // Get song by ID
  async getSongById(id: string): Promise<{ success: boolean; song?: SongItem }> {
    try {
      try {
        const res = await apiClient.get(`/api/songs/${id}`);
        if (res.success && res.song) {
          return res;
        }
      } catch (e) {}

      const song = await mongoService.findOne(COLLECTION, { _id: id });
      if (song) return { success: true, song };

      const seed = INITIAL_SEED_SONGS.find(s => s._id === id || s.id === id);
      if (seed) return { success: true, song: seed };

      return { success: false };
    } catch (err) {
      console.error('Error getting song by ID:', err);
      return { success: false };
    }
  }

  // Add a new song
  async addSong(songData: Partial<SongItem>): Promise<{ success: boolean; song?: SongItem; message?: string }> {
    try {
      if (!songData.title || !songData.lyrics || songData.lyrics.length === 0) {
        return { success: false, message: 'Song title and lyrics are required.' };
      }

      const newSong: Partial<SongItem> = {
        title: songData.title.trim(),
        language: songData.language || 'English',
        category: songData.category || 'Worship Songs',
        tags: songData.tags || [songData.language?.toLowerCase() || 'english'],
        youtubeLink: songData.youtubeLink || '',
        chords: songData.chords || '',
        lyrics: songData.lyrics,
      };

      try {
        const res = await apiClient.post('/api/songs', newSong);
        if (res.success && res.song) {
          await mongoService.insertOne(COLLECTION, res.song);
          return res;
        }
      } catch (e) {}

      const created = await mongoService.insertOne(COLLECTION, newSong);
      return { success: true, song: created };
    } catch (err: any) {
      console.error('Error adding song:', err);
      return { success: false, message: err.message || 'Failed to add song.' };
    }
  }

  // Update song
  async updateSong(id: string, songData: Partial<SongItem>): Promise<{ success: boolean; message?: string }> {
    try {
      try {
        const res = await apiClient.put(`/api/songs/${id}`, songData);
        if (res.success) {
          await mongoService.updateOne(COLLECTION, { _id: id }, songData);
          return res;
        }
      } catch (e) {}

      const updatePayload = { ...songData };
      delete updatePayload._id;
      delete updatePayload.id;

      const updated = await mongoService.updateOne(COLLECTION, { _id: id }, updatePayload);
      return { success: updated, message: updated ? 'Song updated successfully' : 'Song not found' };
    } catch (err: any) {
      console.error('Error updating song:', err);
      return { success: false, message: err.message || 'Failed to update song.' };
    }
  }

  // Delete song
  async deleteSong(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      try {
        await apiClient.delete(`/api/songs/${id}`);
      } catch (e) {}

      const deleted = await mongoService.deleteOne(COLLECTION, { _id: id });
      return { success: deleted, message: deleted ? 'Song deleted successfully' : 'Song not found' };
    } catch (err: any) {
      console.error('Error deleting song:', err);
      return { success: false, message: err.message || 'Failed to delete song.' };
    }
  }
}

export const songsService = new SongsService();
