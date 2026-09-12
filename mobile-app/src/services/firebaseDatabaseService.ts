// d:\Church App\mobile-app\src\services\firebaseDatabaseService.ts
import { database } from '../config/firebase';
import { ref, set, get, onValue, push, remove, update } from 'firebase/database';

// ------------------------------------
// 1. LIVE LYRICS (Replaces Socket.IO)
// ------------------------------------
export interface LiveSlidePayload {
  songId: string;
  songTitle: string;
  currentSlideIndex: number;
  totalSlides: number;
  slideText: string;
  chorusText?: string;
  updatedAt: number;
}

// Operator sends updated slide
export const updateLiveLyrics = async (payload: LiveSlidePayload) => {
  const liveRef = ref(database, 'live/lyrics');
  await set(liveRef, payload);
};

// Clear live lyrics display
export const clearLiveLyrics = async () => {
  const liveRef = ref(database, 'live/lyrics');
  await set(liveRef, null);
};

// Viewers listen to real-time changes
export const subscribeToLiveLyrics = (callback: (data: LiveSlidePayload | null) => void) => {
  const liveRef = ref(database, 'live/lyrics');
  return onValue(liveRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as LiveSlidePayload);
    } else {
      callback(null);
    }
  });
};

// ------------------------------------
// 2. SONGS MANAGEMENT
// ------------------------------------
export const fetchAllSongs = async () => {
  const songsRef = ref(database, 'songs');
  const snapshot = await get(songsRef);
  if (!snapshot.exists()) return [];
  
  const val = snapshot.val();
  return Object.keys(val).map(key => ({ id: key, ...val[key] }));
};

export const subscribeToSongs = (callback: (songs: any[]) => void) => {
  const songsRef = ref(database, 'songs');
  return onValue(songsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const val = snapshot.val();
    const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
    callback(list);
  });
};

export const addSong = async (songData: any) => {
  const songsRef = ref(database, 'songs');
  const newSongRef = push(songsRef);
  await set(newSongRef, {
    ...songData,
    createdAt: Date.now()
  });
  return newSongRef.key;
};

// ------------------------------------
// 3. NOTICES & ANNOUNCEMENTS
// ------------------------------------
export const subscribeToNotices = (callback: (notices: any[]) => void) => {
  const noticesRef = ref(database, 'notices');
  return onValue(noticesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const val = snapshot.val();
    const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
    callback(list);
  });
};

export const addNotice = async (noticeData: any) => {
  const noticesRef = ref(database, 'notices');
  const newNoticeRef = push(noticesRef);
  await set(newNoticeRef, {
    ...noticeData,
    createdAt: Date.now()
  });
};

// ------------------------------------
// 4. EVENTS MANAGEMENT
// ------------------------------------
export const subscribeToEvents = (callback: (events: any[]) => void) => {
  const eventsRef = ref(database, 'events');
  return onValue(eventsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const val = snapshot.val();
    const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
    callback(list);
  });
};