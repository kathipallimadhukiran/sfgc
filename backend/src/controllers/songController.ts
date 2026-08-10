import { Request, Response, NextFunction } from 'express';
import { Song } from '../models/Song';

// @route   GET /api/songs
// @desc    Get all songs with optional search and language filter
export const getSongs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, language, category } = req.query;

    const query: any = {};
    if (language && language !== 'All') {
      query.language = language;
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (search) {
      const regex = new RegExp(String(search), 'i');
      query.$or = [
        { title: regex },
        { category: regex },
        { tags: regex },
        { 'lyrics.text': regex },
      ];
    }

    const songs = await Song.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: songs.length,
      songs,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/songs/:id
// @desc    Get single song details
export const getSongById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      res.status(404).json({ success: false, message: 'Song not found.' });
      return;
    }

    // Increment view count
    song.viewsCount = (song.viewsCount || 0) + 1;
    await song.save();

    res.status(200).json({ success: true, song });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/songs
// @desc    Create a new song with lyric slides
export const createSong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, language, category, tags, youtubeLink, chords, lyrics } = req.body;

    if (!title || !lyrics || !Array.isArray(lyrics) || lyrics.length === 0) {
      res.status(400).json({ success: false, message: 'Title and lyrics slides are required.' });
      return;
    }

    const newSong = await Song.create({
      title: title.trim(),
      language: language || 'English',
      category: category || 'Worship Songs',
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      youtubeLink: youtubeLink || '',
      chords: chords || '',
      lyrics,
    });

    res.status(201).json({
      success: true,
      message: 'Song created successfully.',
      song: newSong,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/songs/:id
// @desc    Update a song
export const updateSong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedSong) {
      res.status(404).json({ success: false, message: 'Song not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Song updated successfully.',
      song: updatedSong,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/songs/:id
// @desc    Delete a song
export const deleteSong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) {
      res.status(404).json({ success: false, message: 'Song not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Song deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
