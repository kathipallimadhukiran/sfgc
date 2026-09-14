import { apiClient } from './apiClient';

export interface LiveVideoItem {
  _id: string;
  videoId: string;
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  description?: string;
  categoryId: string;
  thumbnail: string;
  isLive?: boolean;
  publishedAt?: string;
  createdAt: string;
}

export interface GetVideosResponse {
  success: boolean;
  videos: LiveVideoItem[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
}

class LiveVideosService {
  async getVideos(page: number = 1, limit: number = 20, search: string = '', category: string = ''): Promise<GetVideosResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (category) params.append('category', category);

      const response = await apiClient.get(`/api/youtube/videos?${params.toString()}`);
      return {
        success: Boolean(response.success),
        videos: Array.isArray(response.videos) ? response.videos : [],
        page: response.page || page,
        limit: response.limit || limit,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
        hasMore: Boolean(response.hasMore),
      };
    } catch (error) {
      console.log('Unable to load youtube videos:', error);
      return { success: false, videos: [], page, limit, total: 0, totalPages: 1, hasMore: false };
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

  async updateVideo(id: string, data: Partial<Pick<LiveVideoItem, 'title' | 'categoryId'>>): Promise<{ success: boolean; video?: LiveVideoItem; message?: string }> {
    try {
      return await apiClient.put(`/api/stream/videos/${id}`, data);
    } catch (error: any) {
      return { success: false, message: error?.message || 'Unable to update video.' };
    }
  }

  async syncChannel(channelId?: string): Promise<{ success: boolean; message?: string; videos?: LiveVideoItem[] }> {
    try {
      return await apiClient.post('/api/stream/videos/sync-channel', { channelId });
    } catch (error: any) {
      return { success: false, message: error?.message || 'Unable to sync YouTube channel.' };
    }
  }
}

export const liveVideosService = new LiveVideosService();
