import { Request, Response, NextFunction } from 'express';
import { Event } from '../models/Event';
import { Notice } from '../models/Notice';
import { AuthRequest } from '../middleware/auth';

// @route   GET /api/events
// @desc    Get all events ordered by date
export const getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Auto-delete events that ended 4 hours after scheduled start time (e.g. 1pm event auto-deleted at 5pm)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    await Event.deleteMany({ date: { $lt: fourHoursAgo } });

    const events = await Event.find().sort({ date: 1 });
    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/events/:id
// @desc    Get single event by ID
export const getEventById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }
    res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/events
// @desc    Create a new church event
export const createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, banner, imageUrl, speaker, venue, date, time, mapsLocation, description, requiresRSVP } = req.body;

    if (!title || !venue || !date) {
      res.status(400).json({ success: false, message: 'Title, venue, and date are required.' });
      return;
    }

    const newEvent = await Event.create({
      title: title.trim(),
      banner: (banner || imageUrl || '').trim(),
      speaker: speaker?.trim() || '',
      venue: venue.trim(),
      date,
      time: time || '',
      mapsLocation: mapsLocation || '',
      description: description || '',
      requiresRSVP: Boolean(requiresRSVP),
      rsvps: [],
    });

    // Auto-post Church Notification / Announcement to all members
    try {
      const eventDateStr = new Date(date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const newNotice = await Notice.create({
        title: `📢 New Event: ${title.trim()}`,
        description: `📅 ${eventDateStr} ${time ? `at ${time}` : ''} | 📍 ${venue.trim()}${speaker ? ` | 🎙️ Speaker: ${speaker.trim()}` : ''}\n${description ? description.trim() : 'Warm welcome to attend and be blessed in God\'s presence!'}`,
        date: new Date().toISOString(),
        time: time || '',
        location: venue.trim(),
        image: (banner || imageUrl || '').trim(),
        isPinned: false,
      });

      // Broadcast notice to connected clients
      const io = (req as any).app.get('io');
      if (io) {
        io.emit('newNotice', newNotice);
      }
    } catch (noticeErr) {
      console.log('Notice creation for event ignored:', noticeErr);
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event: newEvent,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/events/:id
// @desc    Update an event
export const updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updateData = { ...req.body };
    if (updateData.imageUrl && !updateData.banner) {
      updateData.banner = updateData.imageUrl;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      event: updatedEvent,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/events/:id
// @desc    Delete an event
export const deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/events/:id/rsvp
// @desc    Toggle RSVP attendance for an event
export const toggleRSVP = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id?.toString() || req.body.userId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required to RSVP.' });
      return;
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const index = event.rsvps.indexOf(userId);
    let isGoing = false;

    if (index > -1) {
      event.rsvps.splice(index, 1);
      isGoing = false;
    } else {
      event.rsvps.push(userId);
      isGoing = true;
    }

    await event.save();

    res.status(200).json({
      success: true,
      isGoing,
      rsvpsCount: event.rsvps.length,
      message: isGoing ? 'RSVP confirmed. See you there!' : 'RSVP cancelled.',
    });
  } catch (error) {
    next(error);
  }
};
