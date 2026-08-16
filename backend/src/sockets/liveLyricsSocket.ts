import { Server as SocketIOServer, Socket } from 'socket.io';
import { LiveState } from '../models/LiveState';

interface LiveSessionState {
  song: any | null;
  currentSlideIndex: number;
  highlightedLineIndex: number;
  blackScreen: boolean;
  blankScreen: boolean;
  logoScreen: boolean;
  activeYoutubeLink: string;
}

// In-memory active session cache for sub-millisecond real-time latency
let currentLiveSession: LiveSessionState = {
  song: null,
  currentSlideIndex: 0,
  highlightedLineIndex: -1,
  blackScreen: false,
  blankScreen: false,
  logoScreen: false,
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

export interface DisplayDevice {
  id: string;
  name: string;
  type: string;
  ip: string;
  connectedAt: string;
}

const connectedDisplays: Map<string, DisplayDevice> = new Map();

export const getConnectedDisplaysList = (): DisplayDevice[] => {
  return Array.from(connectedDisplays.values());
};

export const setupLiveLyricsSocket = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Register active Smart TV or projection screen
    socket.on('registerDisplay', (payload: { name?: string; type?: string; ip?: string }) => {
      const dev: DisplayDevice = {
        id: socket.id,
        name: payload.name || `Smart TV (${socket.id.substring(0, 5)})`,
        type: payload.type || 'Smart TV Web Cast',
        ip: payload.ip || (socket.handshake.address?.replace('::ffff:', '') || 'Local Network'),
        connectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      connectedDisplays.set(socket.id, dev);
      socket.join('live_worship_room');
      io.emit('displaysUpdated', Array.from(connectedDisplays.values()));
      console.log(`📺 TV Display Registered: ${dev.name} (${dev.ip})`);
    });

    socket.on('getDisplays', () => {
      socket.emit('displaysUpdated', Array.from(connectedDisplays.values()));
    });

    // Immediately send current live session state to the newly connected mobile/web client
    const hasLiveContent = Boolean(currentLiveSession.song || currentLiveSession.activeYoutubeLink);
    socket.emit('sessionState', hasLiveContent ? currentLiveSession : null);
    socket.emit('youtubeLinkUpdated', { youtubeLink: currentLiveSession.activeYoutubeLink });

    // Join session room
    socket.on('joinSession', () => {
      socket.join('live_worship_room');
      const isLiveActive = Boolean(currentLiveSession.song || currentLiveSession.activeYoutubeLink);
      socket.emit('sessionState', isLiveActive ? currentLiveSession : null);
    });

    // Start Live Projection Session (Operator)
    socket.on('startSession', async (payload: { song: any; slideIndex?: number }) => {
      currentLiveSession.song = payload.song;
      currentLiveSession.currentSlideIndex = typeof payload.slideIndex === 'number' ? payload.slideIndex : 0;
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

    // Screen State Changed (Blackout / Blank screen / Logo screen)
    socket.on('screenState', async (payload: { blackScreen: boolean; blankScreen: boolean; logoScreen?: boolean }) => {
      currentLiveSession.blackScreen = Boolean(payload.blackScreen);
      currentLiveSession.blankScreen = Boolean(payload.blankScreen);
      currentLiveSession.logoScreen = Boolean(payload.logoScreen);

      io.emit('screenStateChanged', {
        blackScreen: currentLiveSession.blackScreen,
        blankScreen: currentLiveSession.blankScreen,
        logoScreen: currentLiveSession.logoScreen,
      });

      try {
        await LiveState.findOneAndUpdate(
          { key: 'active_session' },
          {
            $set: {
              blackScreen: currentLiveSession.blackScreen,
              blankScreen: currentLiveSession.blankScreen,
              logoScreen: currentLiveSession.logoScreen,
            },
          }
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
      if (connectedDisplays.has(socket.id)) {
        connectedDisplays.delete(socket.id);
        io.emit('displaysUpdated', Array.from(connectedDisplays.values()));
      }
    });
  });
};
