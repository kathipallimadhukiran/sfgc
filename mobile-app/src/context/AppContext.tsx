import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import io, { Socket } from 'socket.io-client';

import { songsService, SongItem } from '../services/songsService';
import { eventsService, EventItem } from '../services/eventsService';
import { noticesService, NoticeItem } from '../services/noticesService';
import { notificationService } from '../services/notificationService';
import { authService } from '../services/authService';
import { API_URL } from '../constants/config';
import { router } from 'expo-router';

// Fallback Mock data for daily verse
const MOCK_VERSE =
  "For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future. - Jeremiah 29:11";

export const translations = {
  Telugu: {
    welcome: "స్వాగతం",
    guest: "భక్తులు",
    liveWorship: "లైవ్ ఆరాధన ప్రసారం",
    currentSong: "ప్రస్తుత పాట",
    dailyVerse: "నేటి దైవ వాక్యం",
    promise: "నేటి వాగ్దానం",
    share: "షేర్",
    events: "కార్యక్రమాలు",
    viewAll: "అన్నీ చూడండి",
    notices: "తాజా ప్రకటనలు",
    posted: "పోస్ట్ చేయబడింది",
    emptyEvents: "రాబోయే కార్యక్రమాలు ఏవీ లేవు.",
    emptyNotices: "ఇటీవలి ప్రకటనలు ఏవీ లేవు.",
    songs: "పాటలు",
    bible: "బైబిల్",
    profile: "ప్రొఫైల్",
    notifications: "ప్రకటనలు & హెచ్చరికలు",
    goodMorning: "శుభోదయం",
    goodAfternoon: "శుభ మధ్యాహ్నం",
    goodEvening: "శుభ సాయంత్రం",
    quickLookup: "త్వరిత శోధన",
    nowListening: "ప్రస్తుతం వింటున్నది",
    playing: "ప్లే చేయండి",
    complete: "పూర్తయింది",
    readingPlan: "బైబిల్ పఠన ప్రణాళిక",
    devotionals: "రోజువారీ ధ్యానాలు",
    join: "చేరండి",
    going: "వెళ్తున్నాను",
    venue: "స్థలం",
    speaker: "ప్రసంగీకులు",
    searchPlaceholder: "పాటలు లేదా పదాలను శోధించండి...",
    allLanguages: "అన్ని భాషలు",
  },

  English: {
    welcome: "Welcome",
    guest: "Guest",
    liveWorship: "LIVE WORSHIP",
    currentSong: "Current Song",
    dailyVerse: "Daily Bible Verse",
    promise: "Daily Promise",
    share: "Share",
    events: "Services & Events",
    viewAll: "View All",
    notices: "Latest Notices",
    posted: "Posted",
    emptyEvents: "No upcoming services registered.",
    emptyNotices: "No recent announcements.",
    songs: "Songs",
    bible: "Bible",
    profile: "Profile",
    notifications: "Notices & Alerts",
    goodMorning: "Good Morning",
    goodAfternoon: "Good Afternoon",
    goodEvening: "Good Evening",
    quickLookup: "Quick Lookup",
    nowListening: "Now Listening",
    playing: "Playing",
    complete: "Complete",
    readingPlan: "Bible Reading Plan",
    devotionals: "Daily Devotionals",
    join: "Join",
    going: "GOING",
    venue: "Venue",
    speaker: "Speaker",
    searchPlaceholder: "Search songs or keywords...",
    allLanguages: "All Languages",
  },
};

interface AppContextProps {
  user: any;
  token: string | null;

  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;

  songs: SongItem[];
  events: EventItem[];
  notices: NoticeItem[];

  dailyVerse: string;

  favorites: string[];
  toggleFavorite: (songId: string) => void;

  liveSession: any | null;
  joinLiveSession: () => void;
  leaveLiveSession: () => void;
  updateLiveYoutubeLink: (youtubeLink: string) => Promise<void>;
  startLiveSession: (song: SongItem, slideIndex?: number) => void;
  endLiveSession: () => void;
  socket: Socket | null;

  // Song setlist / service schedule
  setlist: SongItem[];
  addToSetlist: (song: SongItem) => void;
  removeFromSetlist: (songId: string) => void;
  reorderSetlist: (fromIndex: number, toIndex: number) => void;
  clearSetlist: () => void;

  loading: boolean;
  refreshData: () => Promise<void>;

  language: 'Telugu' | 'English';
  setLanguage: (lang: 'Telugu' | 'English') => Promise<void>;

  bibleLanguage: 'Telugu' | 'English';
  setBibleLanguage: (lang: 'Telugu' | 'English') => Promise<void>;

  t: typeof translations.Telugu;

  selectedBiblePlan: string;
  setSelectedBiblePlan: (plan: string) => Promise<void>;

  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  const [songs, setSongs] = useState<SongItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);

  const [favorites, setFavorites] = useState<string[]>([]);

  const [liveSession, setLiveSession] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);

  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [setlist, setSetlistState] = useState<SongItem[]>([]);

  const [language, setLanguageState] =
    useState<'Telugu' | 'English'>('Telugu');

  const [bibleLanguage, setBibleLanguageState] =
    useState<'Telugu' | 'English'>('Telugu');

  const [selectedBiblePlan, setSelectedBiblePlanState] =
    useState<string>('');

  const [themeMode, setThemeModeState] =
    useState<'light' | 'dark'>('light');

  // --------------------------------------------------
  // Load auth state, cache, language and settings
  // --------------------------------------------------

  useEffect(() => {
    const loadCache = async () => {
      try {
        // Migration: Run once to clear stale cached dummy progress, notices, songs, and events
        const hasClearedCache = await AsyncStorage.getItem('hasClearedStaleCache_v5');
        if (!hasClearedCache) {
          await AsyncStorage.removeItem('@church_app_db_notices');
          await AsyncStorage.removeItem('@church_app_db_songs');
          await AsyncStorage.removeItem('@church_app_db_events');
          await AsyncStorage.removeItem('@bible_plan_user_progress_1-year-canonical');
          await AsyncStorage.removeItem('@bible_plan_user_progress_guest_user');
          await AsyncStorage.setItem('hasClearedStaleCache_v5', 'true');
          console.log('🧹 Stale local cache and un-scoped Bible plan progress cleared!');
        }

        const savedToken = await AsyncStorage.getItem('userToken');
        const savedUser = await AsyncStorage.getItem('userData');

        const savedFavs = await AsyncStorage.getItem('favorites');

        const savedLang = await AsyncStorage.getItem('appLanguage');
        const savedBibleLang =
          await AsyncStorage.getItem('bibleLanguage');

        const savedBiblePlan =
          await AsyncStorage.getItem('selectedBiblePlan');

        const savedTheme =
          await AsyncStorage.getItem('appTheme');

        // App language
        if (savedLang === 'English' || savedLang === 'Telugu') {
          setLanguageState(savedLang);
        }

        // Bible language
        if (
          savedBibleLang === 'English' ||
          savedBibleLang === 'Telugu'
        ) {
          setBibleLanguageState(savedBibleLang);
        }

        // Authentication
        if (savedToken && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);

            if (
              parsedUser &&
              typeof parsedUser === 'object'
            ) {
              setToken(savedToken);
              setUser(parsedUser);

              // Refresh latest profile from MongoDB Atlas
              // in the background.
              authService
                .getMe()
                .then((res) => {
                  if (res.success && res.user) {
                    setUser(res.user);
                  }
                })
                .catch(() => {});
            } else {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
            }
          } catch (e) {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
          }
        }

        // Favorites
        if (savedFavs) {
          try {
            setFavorites(JSON.parse(savedFavs));
          } catch {
            setFavorites([]);
          }
        }

        // Language
        if (
          savedLang === 'English' ||
          savedLang === 'Telugu'
        ) {
          setLanguageState(savedLang);
        }

        // Bible plan
        if (savedBiblePlan) {
          setSelectedBiblePlanState(savedBiblePlan);
        }

        // Theme
        if (
          savedTheme === 'light' ||
          savedTheme === 'dark'
        ) {
          setThemeModeState(savedTheme);
        }

        // Setlist
        const savedSetlist = await AsyncStorage.getItem('serviceSetlist');
        if (savedSetlist) {
          try {
            setSetlistState(JSON.parse(savedSetlist));
          } catch {
            setSetlistState([]);
          }
        }

        // --------------------------------------------------
        // Fetch application data
        // --------------------------------------------------

        const [
          songsRes,
          eventsRes,
          noticesRes,
        ] = await Promise.all([
          songsService.getSongs(),
          eventsService.getEvents(),
          noticesService.getNotices(),
        ]);

        if (songsRes.songs) {
          setSongs(songsRes.songs);
        }

        if (eventsRes.events) {
          setEvents(eventsRes.events);
        }

        if (noticesRes.notices) {
          setNotices(noticesRes.notices);
        }
      } catch (err) {
        console.log(
          'Error initializing app state:',
          err
        );
      } finally {
        setLoading(false);
      }
    };

    loadCache();
    initGlobalSocket();
  }, []);

  // --------------------------------------------------
  // Language
  // --------------------------------------------------

  const setLanguage = async (
    lang: 'Telugu' | 'English'
  ) => {
    setLanguageState(lang);

    await AsyncStorage.setItem(
      'appLanguage',
      lang
    );
  };

  // --------------------------------------------------
  // Bible language
  // --------------------------------------------------

  const setBibleLanguage = async (
    lang: 'Telugu' | 'English'
  ) => {
    setBibleLanguageState(lang);

    await AsyncStorage.setItem(
      'bibleLanguage',
      lang
    );
  };

  // --------------------------------------------------
  // Bible reading plan
  // --------------------------------------------------

  const setSelectedBiblePlan = async (
    plan: string
  ) => {
    setSelectedBiblePlanState(plan);

    await AsyncStorage.setItem(
      'selectedBiblePlan',
      plan
    );
  };

  // --------------------------------------------------
  // Theme
  // --------------------------------------------------

  const setThemeMode = async (
    mode: 'light' | 'dark'
  ) => {
    setThemeModeState(mode);

    await AsyncStorage.setItem(
      'appTheme',
      mode
    );
  };

  // --------------------------------------------------
  // Login
  // --------------------------------------------------

  const login = async (
    userToken: string,
    userData: any
  ) => {
    setToken(userToken);
    setUser(userData);

    await AsyncStorage.setItem(
      'userToken',
      userToken
    );

    await AsyncStorage.setItem(
      'userData',
      JSON.stringify(userData)
    );

    await refreshData();
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const logout = async () => {
    setToken(null);
    setUser(null);

    await AsyncStorage.removeItem(
      'userToken'
    );

    await AsyncStorage.removeItem(
      'userData'
    );

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }

    setLiveSession(null);
  };

  // --------------------------------------------------
  // Refresh data
  // --------------------------------------------------

  const refreshData = async () => {
    try {
      const [
        songsRes,
        eventsRes,
        noticesRes,
      ] = await Promise.all([
        songsService.getSongs(),
        eventsService.getEvents(),
        noticesService.getNotices(),
      ]);

      if (songsRes.songs) {
        setSongs(songsRes.songs);
      }

      if (eventsRes.events) {
        setEvents(eventsRes.events);
      }

      if (noticesRes.notices) {
        setNotices(noticesRes.notices);
      }
    } catch (err) {
      console.log(
        'Error refreshing in-app data:',
        err
      );
    }
  };

  // --------------------------------------------------
  // Favorites
  // --------------------------------------------------

  const toggleFavorite = async (
    songId: string
  ) => {
    let updated: string[];

    if (favorites.includes(songId)) {
      updated = favorites.filter(
        (id) => id !== songId
      );
    } else {
      updated = [
        ...favorites,
        songId,
      ];
    }

    setFavorites(updated);

    await AsyncStorage.setItem(
      'favorites',
      JSON.stringify(updated)
    );
  };

  // --------------------------------------------------
  // Setlist / Service Schedule
  // --------------------------------------------------

  const addToSetlist = (song: SongItem) => {
    setSetlistState((prev) => {
      const songId = song._id || song.id || '';
      if (prev.some((s) => (s._id || s.id) === songId)) return prev; // already in setlist
      const updated = [...prev, song];
      AsyncStorage.setItem('serviceSetlist', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const removeFromSetlist = (songId: string) => {
    setSetlistState((prev) => {
      const updated = prev.filter((s) => (s._id || s.id) !== songId);
      AsyncStorage.setItem('serviceSetlist', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const reorderSetlist = (fromIndex: number, toIndex: number) => {
    setSetlistState((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      AsyncStorage.setItem('serviceSetlist', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const clearSetlist = () => {
    setSetlistState([]);
    AsyncStorage.removeItem('serviceSetlist').catch(() => {});
  };

  // --------------------------------------------------
  // Live session
  // --------------------------------------------------

  const startLiveSession = (song: SongItem, slideIndex: number = 0) => {
    if (socketRef.current) {
      socketRef.current.emit('startSession', { song, slideIndex });
    } else if (socket) {
      socket.emit('startSession', { song, slideIndex });
    }
  };

  const endLiveSession = () => {
    if (socketRef.current) {
      socketRef.current.emit('endSession');
    } else if (socket) {
      socket.emit('endSession');
    }
  };

  const initGlobalSocket = () => {
    if (socketRef.current || !API_URL) return;

    try {
      const newSocket = io(API_URL, {
        timeout: 4000,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('joinSession');
      });

      newSocket.on('newNotice', (newNotice: NoticeItem) => {
        setNotices((prev) => {
          if (prev.some((n) => (n._id || n.id) === (newNotice._id || newNotice.id))) {
            return prev;
          }
          return [newNotice, ...prev];
        });

        // Trigger System Notification
        notificationService.triggerNotification(
          newNotice.title,
          newNotice.description,
          { type: 'NOTICE', id: newNotice._id || newNotice.id }
        );
      });

      newSocket.on('newEvent', (newEvent: EventItem) => {
        setEvents((prev) => {
          const id = newEvent._id || newEvent.id;
          const idx = prev.findIndex((e) => (e._id || e.id) === id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = newEvent;
            return updated;
          }
          return [newEvent, ...prev];
        });
        refreshData();

        // Trigger System Notification
        notificationService.triggerNotification(
          `📅 New Event: ${newEvent.title}`,
          `📍 ${newEvent.venue}${newEvent.time ? ` at ${newEvent.time}` : ''}`,
          { type: 'EVENT', id: newEvent._id || newEvent.id }
        );
      });

      newSocket.on('new_video_notification', (payload: {
        notificationId: string;
        type: string;
        title: string;
        message: string;
        videoId: string;
        youtubeVideoId: string;
        thumbnail: string;
        createdAt: string;
      }) => {
        const newNoticeItem: NoticeItem = {
          _id: payload.notificationId,
          title: `🎬 ${payload.title}`,
          description: payload.message,
          date: payload.createdAt,
          time: new Date(payload.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: 'YouTube Sanctuary Media',
        };

        setNotices((prev) => {
          if (prev.some((n) => (n._id || n.id) === newNoticeItem._id)) {
            return prev;
          }
          return [newNoticeItem, ...prev];
        });

        refreshData();

        // Trigger System Notification
        notificationService.triggerNotification(
          `🎬 ${payload.title}`,
          payload.message,
          { type: 'VIDEO', videoId: payload.videoId }
        );
      });

      newSocket.on(
        'sessionState',
        (state) => {
          setLiveSession(state);
        }
      );

      newSocket.on(
        'slideChanged',
        ({
          currentSlideIndex,
          highlightedLineIndex,
        }) => {
          setLiveSession(
            (prev: any) =>
              prev
                ? {
                    ...prev,
                    currentSlideIndex,
                    highlightedLineIndex,
                  }
                : null
          );
        }
      );

      newSocket.on(
        'screenStateChanged',
        ({
          blackScreen,
          blankScreen,
        }) => {
          setLiveSession(
            (prev: any) =>
              prev
                ? {
                    ...prev,
                    blackScreen,
                    blankScreen,
                  }
                : null
          );
        }
      );

      newSocket.on(
        'lineHighlighted',
        ({ lineIndex }) => {
          setLiveSession(
            (prev: any) =>
              prev
                ? {
                    ...prev,
                    highlightedLineIndex:
                      lineIndex,
                  }
                : null
          );
        }
      );

      newSocket.on(
        'youtubeLinkUpdated',
        ({ youtubeLink }) => {
          setLiveSession(
            (prev: any) => {
              if (!youtubeLink) {
                return prev?.song ? { ...prev, activeYoutubeLink: '' } : null;
              }

              if (!prev) {
                return {
                  activeYoutubeLink: youtubeLink,
                  song: { title: 'Sanctuary Live Stream', youtubeLink },
                };
              }

              return {
                ...prev,
                activeYoutubeLink: youtubeLink,
                song: prev.song
                  ? {
                      ...prev.song,
                      youtubeLink,
                    }
                  : {
                      title: 'Sanctuary Live Stream',
                      youtubeLink,
                    },
              };
            }
          );
        }
      );

      newSocket.on('new_promise_notification', (payload: any) => {
        refreshData();
        notificationService.triggerNotification(
          `🌅 ${payload.title || "Today's Daily Promise"}`,
          `"${payload.verseTelugu}" - ${payload.referenceTelugu}`,
          { type: 'PROMISE' }
        );
      });

      newSocket.on(
        'sessionEnded',
        () => {
          setLiveSession(null);
        }
      );
    } catch (err) {
      console.log(
        'Live session socket connection skipped'
      );
    }
  };

  const joinLiveSession = () => {
    if (socketRef.current) {
      socketRef.current.emit('joinSession');
    } else {
      initGlobalSocket();
    }
  };

  // --------------------------------------------------
  // Leave live session
  // --------------------------------------------------

  const leaveLiveSession = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setLiveSession(null);
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
      setLiveSession(null);
    }
  };

  // --------------------------------------------------
  // Update YouTube link
  // --------------------------------------------------

  const updateLiveYoutubeLink = async (
    youtubeLink: string
  ) => {
    const response = await fetch(`${API_URL}/api/stream`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ activeYoutubeLink: youtubeLink }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to save the live stream link.');
    }

    if (socket) {
      socket.emit(
        'updateYoutubeLink',
        {
          youtubeLink,
        }
      );
    }

    setLiveSession(
      (prev: any) => {
        if (!prev) {
          return null;
        }

        return {
          ...prev,
          song: prev.song
            ? {
                ...prev.song,
                youtubeLink,
              }
            : {
                youtubeLink,
              },
        };
      }
    );
  };

  // --------------------------------------------------
  // Translations
  // --------------------------------------------------

  const t =
    translations[language] ||
    translations.Telugu;

  // --------------------------------------------------
  // Provider
  // --------------------------------------------------

  return (
    <AppContext.Provider
      value={{
        user,
        token,

        login,
        logout,

        songs,
        events,
        notices,

        dailyVerse: MOCK_VERSE,

        favorites,
        toggleFavorite,

        liveSession,
        joinLiveSession,
        leaveLiveSession,
        updateLiveYoutubeLink,
        startLiveSession,
        endLiveSession,
        socket,

        setlist,
        addToSetlist,
        removeFromSetlist,
        reorderSetlist,
        clearSetlist,

        loading,
        refreshData,

        language,
        setLanguage,

        bibleLanguage,
        setBibleLanguage,

        t,

        selectedBiblePlan,
        setSelectedBiblePlan,

        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// --------------------------------------------------
// useApp Hook
// --------------------------------------------------

export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      'useApp must be used within an AppProvider'
    );
  }

  return context;
};
