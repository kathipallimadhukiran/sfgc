import CastContext, { MediaInfo } from 'react-native-google-cast';

export interface CastMediaPayload {
  url: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  contentType?: string; // e.g. 'video/mp4', 'application/x-mpegurl', 'audio/mp3'
  isLive?: boolean;
}

export interface CastPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  currentMedia: CastMediaPayload | null;
}

export class CastMediaServiceClass {
  private static instance: CastMediaServiceClass;
  private currentMedia: CastMediaPayload | null = null;
  private playbackState: CastPlaybackState = {
    isPlaying: false,
    isPaused: false,
    isBuffering: false,
    positionMs: 0,
    durationMs: 0,
    currentMedia: null,
  };
  private listeners: Set<(state: CastPlaybackState) => void> = new Set();

  private constructor() {}

  public static getInstance(): CastMediaServiceClass {
    if (!CastMediaServiceClass.instance) {
      CastMediaServiceClass.instance = new CastMediaServiceClass();
    }
    return CastMediaServiceClass.instance;
  }

  public addPlaybackListener(listener: (state: CastPlaybackState) => void): () => void {
    this.listeners.add(listener);
    listener(this.playbackState);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.playbackState));
  }

  private async getCurrentSession() {
    try {
      if (CastContext && typeof CastContext.getSessionManager === 'function') {
        const sessionManager = CastContext.getSessionManager();
        if (sessionManager && typeof sessionManager.getCurrentCastSession === 'function') {
          return await sessionManager.getCurrentCastSession();
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Load media (video, live stream, worship audio) onto the connected TV
   */
  public async loadMedia(media: CastMediaPayload): Promise<boolean> {
    this.currentMedia = media;
    this.playbackState = {
      ...this.playbackState,
      currentMedia: media,
      isBuffering: true,
      isPlaying: false,
    };
    this.notifyListeners();

    try {
      const castSession = await this.getCurrentSession();
      if (castSession && typeof castSession.client?.loadMedia === 'function') {
        const mediaInfo: any = {
          contentUrl: media.url,
          contentType: media.contentType || 'video/mp4',
          streamType: media.isLive ? 'live' : 'buffered',
          metadata: {
            type: 'movie',
            title: media.title,
            subtitle: media.subtitle || 'SFGC Church Sanctuary',
            images: media.imageUrl ? [{ url: media.imageUrl }] : [],
          },
        };

        await castSession.client.loadMedia({
          mediaInfo,
          autoplay: true,
        });

        this.playbackState = {
          ...this.playbackState,
          isPlaying: true,
          isPaused: false,
          isBuffering: false,
        };
        this.notifyListeners();
        return true;
      }

      // Fallback
      this.playbackState = {
        ...this.playbackState,
        isPlaying: true,
        isPaused: false,
        isBuffering: false,
      };
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('❌ Error loading media on Cast device:', error);
      this.playbackState = {
        ...this.playbackState,
        isPlaying: false,
        isBuffering: false,
      };
      this.notifyListeners();
      return false;
    }
  }

  public async play(): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (session?.client) {
        await session.client.play();
      }
    } catch (e) {}
    this.playbackState = { ...this.playbackState, isPlaying: true, isPaused: false };
    this.notifyListeners();
  }

  public async pause(): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (session?.client) {
        await session.client.pause();
      }
    } catch (e) {}
    this.playbackState = { ...this.playbackState, isPlaying: false, isPaused: true };
    this.notifyListeners();
  }

  public async seek(positionSeconds: number): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (session?.client) {
        await session.client.seek({ position: positionSeconds });
      }
    } catch (e) {}
    this.playbackState = { ...this.playbackState, positionMs: positionSeconds * 1000 };
    this.notifyListeners();
  }

  public async stop(): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (session?.client) {
        await session.client.stop();
      }
    } catch (e) {}
    this.playbackState = {
      isPlaying: false,
      isPaused: false,
      isBuffering: false,
      positionMs: 0,
      durationMs: 0,
      currentMedia: null,
    };
    this.currentMedia = null;
    this.notifyListeners();
  }

  public getPlaybackState(): CastPlaybackState {
    return this.playbackState;
  }
}

export const CastMediaService = CastMediaServiceClass.getInstance();
