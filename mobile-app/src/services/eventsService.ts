import { mongoService } from './mongoService';
import { apiClient } from './apiClient';

export interface EventItem {
  _id?: string;
  id?: string;
  title: string;
  banner?: string;
  imageUrl?: string;
  speaker?: string;
  venue: string;
  date: string;
  time?: string;
  description?: string;
  mapsLocation?: string;
  requiresRSVP?: boolean;
  rsvps?: string[];
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION = 'events';

class EventsService {
  private initialized = false;


  // Get all events
  async getEvents(): Promise<{ success: boolean; events: EventItem[] }> {
    const parseEventTimestamp = (dateStr: any): number => {
      if (!dateStr) return 0;
      if (dateStr instanceof Date) return dateStr.getTime();

      const str = String(dateStr).trim();
      let parsed = Date.parse(str);
      if (!isNaN(parsed)) return parsed;

      const parts = str.split(/[\/\.-]/);
      if (parts.length === 3 && parts[2].length === 4) {
        parsed = Date.parse(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(parsed)) return parsed;
      }
      return 0;
    };

    try {
      const res = await apiClient.get('/api/events');
      const list = Array.isArray(res?.events) 
        ? res.events 
        : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      
      if (Array.isArray(list)) {
        const sortedEvents = [...list].sort((a: any, b: any) => {
          const tA = parseEventTimestamp(a.date);
          const tB = parseEventTimestamp(b.date);
          return tA - tB;
        });
        await mongoService.setLocalCollection(COLLECTION, sortedEvents);
        return { success: true, events: sortedEvents };
      }
    } catch (networkErr) {
      console.log('Backend events API unreachable, loading from local DB');
    }

    try {
      const events = await mongoService.find(COLLECTION, { sort: { date: 1 } });
      const realEvents = events
        .filter((e: any) => !String(e._id || e.id || '').startsWith('seed_event_'))
        .sort((a: any, b: any) => parseEventTimestamp(a.date) - parseEventTimestamp(b.date));
      return { success: true, events: realEvents };
    } catch (err) {
      console.error('Error getting events:', err);
      return { success: true, events: [] };
    }
  }

  // Add event
  async addEvent(eventData: Partial<EventItem>): Promise<{ success: boolean; event?: EventItem; message?: string }> {
    try {
      if (!eventData.title || !eventData.venue || !eventData.date) {
        return { success: false, message: 'Title, venue, and date are required.' };
      }

      const newEvent: Partial<EventItem> = {
        title: eventData.title.trim(),
        venue: eventData.venue.trim(),
        speaker: eventData.speaker?.trim() || '',
        date: eventData.date,
        time: eventData.time || '',
        banner: eventData.banner || '',
        mapsLocation: eventData.mapsLocation || '',
        description: eventData.description || '',
        rsvps: [],
      };

      try {
        const res = await apiClient.post('/api/events', newEvent);
        if (res.success && res.event) {
          await mongoService.insertOne(COLLECTION, res.event);
          return res;
        }
      } catch (e) {}

      const created = await mongoService.insertOne(COLLECTION, newEvent);
      return { success: true, event: created };
    } catch (err: any) {
      console.error('Error adding event:', err);
      return { success: false, message: err.message || 'Failed to add event.' };
    }
  }

  // Update event
  async updateEvent(id: string, eventData: Partial<EventItem>): Promise<{ success: boolean; message?: string }> {
    try {
      try {
        const res = await apiClient.put(`/api/events/${id}`, eventData);
        if (res.success) {
          await mongoService.updateOne(COLLECTION, { _id: id }, eventData);
          return res;
        }
      } catch (e) {}

      const updatePayload = { ...eventData };
      delete updatePayload._id;
      delete updatePayload.id;

      const updated = await mongoService.updateOne(COLLECTION, { _id: id }, updatePayload);
      return { success: updated, message: updated ? 'Event updated successfully' : 'Event not found' };
    } catch (err: any) {
      console.error('Error updating event:', err);
      return { success: false, message: err.message || 'Failed to update event.' };
    }
  }

  // Delete event
  async deleteEvent(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      try {
        await apiClient.delete(`/api/events/${id}`);
      } catch (e) {}

      const deleted = await mongoService.deleteOne(COLLECTION, { _id: id });
      return { success: deleted, message: deleted ? 'Event deleted successfully' : 'Event not found' };
    } catch (err: any) {
      console.error('Error deleting event:', err);
      return { success: false, message: err.message || 'Failed to delete event.' };
    }
  }

  // Toggle RSVP / Attendance
  async toggleRSVP(eventId: string, userId: string): Promise<{ success: boolean; isGoing: boolean }> {
    try {
      try {
        const res = await apiClient.post(`/api/events/${eventId}/rsvp`, { userId });
        if (res.success) {
          return res;
        }
      } catch (e) {}

      const event = await mongoService.findOne(COLLECTION, { _id: eventId });
      if (!event) return { success: false, isGoing: false };

      let rsvps: string[] = event.rsvps || [];
      const index = rsvps.indexOf(userId);
      let isGoing = false;

      if (index > -1) {
        rsvps.splice(index, 1);
        isGoing = false;
      } else {
        rsvps.push(userId);
        isGoing = true;
      }

      await mongoService.updateOne(COLLECTION, { _id: eventId }, { rsvps });
      return { success: true, isGoing };
    } catch (err) {
      console.error('Error toggling RSVP:', err);
      return { success: false, isGoing: false };
    }
  }

  // Admin manually re-pushes event push notification to all devices
  async pushEventNotification(eventId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiClient.post(`/api/events/${eventId}/push`, {});
      return res;
    } catch (err: any) {
      console.error('Error pushing event notification:', err);
      return { success: false, message: err.message || 'Failed to push notification.' };
    }
  }
}

export const eventsService = new EventsService();
