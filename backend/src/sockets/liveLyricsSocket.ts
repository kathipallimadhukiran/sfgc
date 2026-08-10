import { Server as SocketIOServer, Socket } from 'socket.io';
import { LiveState } from '../models/LiveState';

interface LiveSessionState {
  song: any | null;
  currentSlideIndex: number;
  highlightedLineIndex: number;
  blackScreen: boolean;
  blankScreen: boolean;
  activeYoutubeLink: string;
}

// In-memory active session cache for sub-millisecond real-time latency
let currentLiveSession: LiveSessionState = {
  song: null,
  currentSlideIndex: 0,
  highlightedLineIndex: -1,
  blackScreen: false,
  blankScreen: false,
  activeYoutubeLink: '',
};

// Initialize session state from MongoDB if available
export const initLiveStateFromDB = async () => {
  try {
    const savedState = await LiveState.findOne({ key: 'active_session' });
    if (savedState) {
      currentLiveSession.activeYoutubeLink = savedState.activeYoutubeLink || currentLiveSession.activeYoutubeLink;
      currentLiveSession.song = savedState.song || null;
      currentLiveSession.currentSlideIndex = savedState.currentSlideIndex || 0;
      currentLiveSession.highlightedLineIndex = savedState.highlightedLineIndex ?? -1;
      currentLiveSession.blackScreen = Boolean(savedState.blackScreen);
      currentLiveSession.blankScreen = Boolean(savedState.blankScreen);
    }
  } catch (err) {
    console.warn('⚠️ Could not load initial live state from DB:', err);
  }
};

export const setupLiveLyricsSocket = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Immediately send current live session state to the newly connected mobile/web client
    socket.emit('sessionState', currentLiveSession.song ? currentLiveSession : null);
    socket.emit('youtubeLinkUpdated', { youtubeLink: currentLiveSession.activeYoutubeLink });

    // Join session room
    socket.on('joinSession', () => {
      socket.join('live_worship_room');
      socket.emit('sessionState', currentLiveSession.song ? currentLiveSession : null);
    });

    // Start Live Projection Session (Operator)
    socket.on('startSession', async (payload: { song: any; slideIndex?: number }) => {
      currentLiveSession.song = payload.song;
      currentLiveSession.currentSlideIndex = payload.slideIndex || 0;
      currentLiveSession.highlightedLineIndex = -1;
      currentLiveSession.blackScreen = false;
      currentLiveSession.blankScreen = false;

      io.emit('sessionState', currentLiveSession);
      console.log(`🎤 Started live session for song: ${payload.song?.title}`);

      // Persist to DB asynchronously
      try {
        await LiveState.findOneAndUpdate(
          { key: 'active_session' },
          { $set: { ...currentLiveSession, startedAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {}
    });

    // Change slide (Operator)
    socket.on('changeSlide', async (payload: { currentSlideIndex: number; highlightedLineIndex?: number }) => {
      currentLiveSession.currentSlideIndex = payload.currentSlideIndex;
      currentLiveSession.highlightedLineIndex = payload.highlightedLineIndex !== undefined ? payload.highlightedLineIndex : -1;

      io.emit('slideChanged', {
        currentSlideIndex: currentLiveSession.currentSlideIndex,
        highlightedLineIndex: currentLiveSession.highlightedLineIndex,
      });

      try {
        await LiveState.findOneAndUpdate(
          { key: 'active_session' },
          { $set: { currentSlideIndex: currentLiveSession.currentSlideIndex, highlightedLineIndex: currentLiveSession.highlightedLineIndex } }
        );
      } catch (e) {}
    });

    // Highlight specific line (Operator)
    socket.on('highlightLine', async (payload: { lineIndex: number }) => {
      currentLiveSession.highlightedLineIndex = payload.lineIndex;
      io.emit('lineHighlighted', { lineIndex: payload.lineIndex });
    });

    // Screen State Changed (Blackout / Blank screen)
    socket.on('screenState', async (payload: { blackScreen: boolean; blankScreen: boolean }) => {
      currentLiveSession.blackScreen = Boolean(payload.blackScreen);
      currentLiveSession.blankScreen = Boolean(payload.blankScreen);

      io.emit('screenStateChanged', {
        blackScreen: currentLiveSession.blackScreen,
        blankScreen: currentLiveSession.blankScreen,
      });

      try {
        await LiveState.findOneAndUpdate(
          { key: 'active_session' },
          { $set: { blackScreen: currentLiveSession.blackScreen, blankScreen: currentLiveSession.blankScreen } }
        );
      } catch (e) {}
    });

    // Update Sanctuary YouTube live video feed
    socket.on('updateYoutubeLink', async (payload: { youtubeLink: string }) => {
      if (payload.youtubeLink) {
        currentLiveSession.activeYoutubeLink = payload.youtubeLink;
        io.emit('youtubeLinkUpdated', { youtubeLink: payload.youtubeLink });

        try {
          await LiveState.findOneAndUpdate(
            { key: 'active_session' },
            { $set: { activeYoutubeLink: payload.youtubeLink } },
            { upsert: true }
          );
        } catch (e) {}
      }
    });

    // End Live Session
    socket.on('endSession', async () => {
      currentLiveSession.song = null;
      currentLiveSession.currentSlideIndex = 0;
      currentLiveSession.highlightedLineIndex = -1;
      currentLiveSession.blackScreen = false;
      currentLiveSession.blankScreen = false;

      io.emit('sessionEnded');
      console.log('⏹️ Live worship projection session ended');

      try {
        await LiveState.findOneAndUpdate(
          { key: 'active_session' },
          { $set: { song: null, currentSlideIndex: 0, highlightedLineIndex: -1 } }
        );
      } catch (e) {}
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });
};
