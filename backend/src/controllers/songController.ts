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
    if (category && category !== 'All' && category !== 'All Categories') {
      const cleanCat = String(category).replace(/\s+Songs$/i, '');
      query.category = { $regex: new RegExp(cleanCat, 'i') };
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

    let songs = await Song.find(query).collation({ locale: 'te', strength: 1 }).sort({ title: 1 });
    // In-memory multilingual sort fallback to guarantee pure alphabetical order for Telugu & English
    songs.sort((a, b) => (a.title || '').localeCompare(b.title || '', ['te', 'en'], { sensitivity: 'base' }));

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
      category: category || 'Worship',
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      youtubeLink: youtubeLink || '',
      chords: chords || '',
      lyrics: lyrics.filter((s: any) => s && s.text && s.text.trim() !== ''),
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
    // Filter empty lyric slides before update
    const cleanBody = { ...req.body };
    if (Array.isArray(cleanBody.lyrics)) {
      cleanBody.lyrics = cleanBody.lyrics.filter((s: any) => s && s.text && s.text.trim() !== '');
    }

    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id,
      { $set: cleanBody },
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
