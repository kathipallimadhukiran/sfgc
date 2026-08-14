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
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION = 'notices';

const INITIAL_SEED_NOTICES: NoticeItem[] = [];

class NoticesService {
  private initialized = false;

  async initSeedData(): Promise<void> {
    if (this.initialized) return;
    try {
      const existing = await mongoService.find(COLLECTION, { limit: 1 });
      if (existing.length === 0) {
        for (const notice of INITIAL_SEED_NOTICES) {
          await mongoService.insertOne(COLLECTION, notice);
        }
      }
      this.initialized = true;
    } catch (err) {
      console.warn('Notices seed init warning:', err);
    }
  }

  // Get all notices
  async getNotices(): Promise<{ success: boolean; notices: NoticeItem[] }> {
    try {
      // 1. Attempt backend fetch
      try {
        const res = await apiClient.get('/api/notices');
        if (res.success && Array.isArray(res.notices)) {
          await mongoService.setLocalCollection(COLLECTION, res.notices);
          return res;
        }
      } catch (networkErr) {
        console.log('Backend notices API unreachable, loading from local DB');
      }

      // 2. Local Fallback
      await this.initSeedData();
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
}

export const noticesService = new NoticesService();
