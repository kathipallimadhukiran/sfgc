import { mongoService } from './mongoService';
import { apiClient } from './apiClient';

export interface NoticeItem {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  date?: string;
  time?: string;
  location?: string;
  image?: string;
  attachment?: string;
  banner?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION = 'notices';

const INITIAL_SEED_NOTICES: NoticeItem[] = [];

class NoticesService {
  private memoryCache: { data: NoticeItem[]; timestamp: number } | null = null;
  private TTL_MS = 30000;

  invalidateCache() {
    this.memoryCache = null;
  }

  // Get all notices
  async getNotices(forceRefresh = false): Promise<{ success: boolean; notices: NoticeItem[] }> {
    const now = Date.now();
    if (!forceRefresh && this.memoryCache && (now - this.memoryCache.timestamp < this.TTL_MS)) {
      return { success: true, notices: this.memoryCache.data };
    }

    try {
      // 1. Attempt backend fetch
      try {
        const res = await apiClient.get('/api/notices');
        if (res.success && Array.isArray(res.notices)) {
          this.memoryCache = { data: res.notices, timestamp: Date.now() };
          mongoService.setLocalCollection(COLLECTION, res.notices).catch(() => {});
          return res;
        }
      } catch (networkErr) {
        console.log('Backend notices API unreachable, loading from local DB');
      }

      // 2. Local Fallback
      const notices = await mongoService.find(COLLECTION, {
        sort: { createdAt: -1 }
      });
      const realNotices = notices
        .filter((n: any) => !String(n._id || n.id || '').startsWith('seed_'));
      return { success: true, notices: realNotices };
    } catch (err) {
      console.error('Error getting notices:', err);
      return { success: true, notices: [] };
    }
  }

  // Add notice
  async addNotice(noticeData: Partial<NoticeItem>): Promise<{ success: boolean; notice?: NoticeItem; message?: string }> {
    this.invalidateCache();
    try {
      if (!noticeData.title || !noticeData.description) {
        return { success: false, message: 'Title and description are required.' };
      }

      const newNotice: Partial<NoticeItem> = {
        title: noticeData.title.trim(),
        description: noticeData.description.trim(),
        date: noticeData.date || new Date().toISOString(),
        time: noticeData.time || '',
        location: noticeData.location || '',
        image: noticeData.image || '',
        attachment: noticeData.attachment || '',
      };

      try {
        const res = await apiClient.post('/api/notices', newNotice);
        if (res.success && res.notice) {
          await mongoService.insertOne(COLLECTION, res.notice);
          return res;
        }
      } catch (e) {}

      const created = await mongoService.insertOne(COLLECTION, newNotice);
      return { success: true, notice: created };
    } catch (err: any) {
      console.error('Error adding notice:', err);
      return { success: false, message: err.message || 'Failed to add notice.' };
    }
  }

  // Update notice
  async updateNotice(id: string, noticeData: Partial<NoticeItem>): Promise<{ success: boolean; message?: string }> {
    this.invalidateCache();
    try {
      try {
        const res = await apiClient.put(`/api/notices/${id}`, noticeData);
        if (res.success) {
          await mongoService.updateOne(COLLECTION, { _id: id }, noticeData);
          return res;
        }
      } catch (e) {}

      const updatePayload = { ...noticeData };
      delete updatePayload._id;
      delete updatePayload.id;

      const updated = await mongoService.updateOne(COLLECTION, { _id: id }, updatePayload);
      return { success: updated, message: updated ? 'Notice updated successfully' : 'Notice not found' };
    } catch (err: any) {
      console.error('Error updating notice:', err);
      return { success: false, message: err.message || 'Failed to update notice.' };
    }
  }

  // Delete notice
  async deleteNotice(id: string): Promise<{ success: boolean; message?: string }> {
    this.invalidateCache();
    try {
      try {
        await apiClient.delete(`/api/notices/${id}`);
      } catch (e) {}

      const deleted = await mongoService.deleteOne(COLLECTION, { _id: id });
      return { success: deleted, message: deleted ? 'Notice deleted successfully' : 'Notice not found' };
    } catch (err: any) {
      console.error('Error deleting notice:', err);
      return { success: false, message: err.message || 'Failed to delete notice.' };
    }
  }

  // Admin manually re-pushes notice push notification to all devices
  async pushNoticeNotification(noticeId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiClient.post(`/api/notices/${noticeId}/push`, {});
      return res;
    } catch (err: any) {
      console.error('Error pushing notice notification:', err);
      return { success: false, message: err.message || 'Failed to push notice notification.' };
    }
  }
}

export const noticesService = new NoticesService();
