import { apiClient } from './apiClient';

export interface LiveVideoItem {
  _id: string;
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  categoryId: string;
  thumbnail: string;
  createdAt: string;
}

class LiveVideosService {
  async getVideos(): Promise<{ success: boolean; videos: LiveVideoItem[] }> {
    try {
      const response = await apiClient.get('/api/stream/videos');
      return { success: Boolean(response.success), videos: Array.isArray(response.videos) ? response.videos : [] };
    } catch (error) {
      console.log('Unable to load live videos:', error);
      return { success: false, videos: [] };
    }
  }

  async addVideo(data: Pick<LiveVideoItem, 'youtubeUrl' | 'title' | 'categoryId'>): Promise<{ success: boolean; video?: LiveVideoItem; message?: string }> {
    try {
      return await apiClient.post('/api/stream/videos', data);
    } catch (error: any) {
      return { success: false, message: error?.message || 'Unable to save video.' };
    }
  }

  async deleteVideo(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      return await apiClient.delete(`/api/stream/videos/${id}`);
    } catch (error: any) {
      return { success: false, message: error?.message || 'Unable to delete video.' };
    }
  }
}

export const liveVideosService = new LiveVideosService();
