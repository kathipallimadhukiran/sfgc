import { CastDeviceDiscovery, CastDeviceItem, DiscoveryResult } from './CastDeviceDiscovery';
import { CastMediaPayload, CastMediaService } from './CastMediaService';
import CastContext from 'react-native-google-cast';

export type CastState = 'disconnected' | 'searching' | 'connecting' | 'connected' | 'error';

export interface CastServiceState {
  state: CastState;
  connectedDevice: CastDeviceItem | null;
  discoveredDevices: CastDeviceItem[];
  errorMessage: string | null;
  showPicker: boolean;
}

type StateChangeListener = (serviceState: CastServiceState) => void;

export class CastServiceClass {
  private static instance: CastServiceClass;

  private serviceState: CastServiceState = {
    state: 'disconnected',
    connectedDevice: null,
    discoveredDevices: [],
    errorMessage: null,
    showPicker: false,
  };

  private listeners: Set<StateChangeListener> = new Set();

  private constructor() {
    this.initNativeCastListeners();
  }

  public static getInstance(): CastServiceClass {
    if (!CastServiceClass.instance) {
      CastServiceClass.instance = new CastServiceClass();
    }
    return CastServiceClass.instance;
  }

  /**
   * Subscribe to CastService state changes
   */
  public addStateListener(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.serviceState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<CastServiceState>): void {
    this.serviceState = { ...this.serviceState, ...partial };
    this.listeners.forEach((listener) => listener(this.serviceState));
  }

  public getState(): CastServiceState {
    return this.serviceState;
  }

  private initNativeCastListeners(): void {
    try {
      if (CastContext && typeof CastContext.getSessionManager === 'function') {
        const sessionManager = CastContext.getSessionManager();
        if (sessionManager) {
          sessionManager.onSessionStarted(() => {
            console.log('✅ Native Google Cast Session Started');
            if (this.serviceState.state !== 'connected') {
              this.updateState({ state: 'connected' });
            }
          });

          sessionManager.onSessionEnded(() => {
            console.log('⏹️ Native Google Cast Session Ended');
            this.updateState({
              state: 'disconnected',
              connectedDevice: null,
              showPicker: false,
            });
          });

          sessionManager.onSessionResumed(() => {
            console.log('🔄 Native Google Cast Session Resumed');
            this.updateState({ state: 'connected' });
          });
        }
      }
    } catch (err) {
      console.log('ℹ️ Native Cast event listeners initialized in web/expo-go mode');
    }
  }

  /**
   * Main entry point when user taps the Cast Button
   */
  public async handleCastButtonPress(): Promise<void> {
    // 1. If currently connected, toggle/ask to disconnect or show options
    if (this.serviceState.state === 'connected') {
      return;
    }

    // 2. Start searching for local TVs
    this.updateState({
      state: 'searching',
      errorMessage: null,
      showPicker: false,
    });

    const result: DiscoveryResult = await CastDeviceDiscovery.discoverDevices();

    switch (result.status) {
      case 'NONE':
        console.log('ℹ️ No active TVs discovered yet. Opening Cast picker with TV Web receiver & pairing options...');
        this.updateState({
          state: 'disconnected',
          discoveredDevices: [],
          showPicker: true,
          errorMessage: null,
        });
        break;

      case 'SINGLE':
        // Exactly 1 device found -> Automatically connect!
        console.log(`🎯 Exactly 1 TV found (${result.device.name}). Auto-connecting...`);
        await this.connectToDevice(result.device);
        break;

      case 'MULTIPLE':
        // Multiple devices found -> Open clean device picker dialog
        console.log(`📺 Multiple TVs found (${result.devices.length}). Showing picker...`);
        this.updateState({
          state: 'disconnected',
          discoveredDevices: result.devices,
          showPicker: true,
        });
        break;
    }
  }

  /**
   * Connect to a specific discovered TV device
   */
  public async connectToDevice(device: CastDeviceItem): Promise<boolean> {
    this.updateState({
      state: 'connecting',
      showPicker: false,
      errorMessage: null,
    });

    try {
      // Save last connected TV for future auto-connection preference
      await CastDeviceDiscovery.setLastConnectedDevice(device);

      // Attempt native Google Cast connection if rawDevice is attached
      if (device.rawDevice && CastContext && typeof CastContext.getSessionManager === 'function') {
        try {
          const sessionManager = CastContext.getSessionManager();
          if (sessionManager && typeof sessionManager.startSession === 'function') {
            await sessionManager.startSession(device.rawDevice.deviceId);
          }
        } catch (nativeErr) {
          console.warn('⚠️ Native Cast session trigger error, proceeding with network cast session:', nativeErr);
        }
      }

      this.updateState({
        state: 'connected',
        connectedDevice: device,
        showPicker: false,
        errorMessage: null,
      });

      console.log(`🎉 Successfully connected to TV: ${device.name}`);
      return true;
    } catch (err: any) {
      console.error(`❌ Connection failed to TV (${device.name}):`, err);
      this.updateState({
        state: 'error',
        errorMessage: `Unable to connect to ${device.name}`,
        showPicker: false,
      });
      return false;
    }
  }

  /**
   * Disconnect from current TV session
   */
  public async disconnect(): Promise<void> {
    try {
      if (CastContext && typeof CastContext.getSessionManager === 'function') {
        const sessionManager = CastContext.getSessionManager();
        if (sessionManager && typeof sessionManager.endCurrentSession === 'function') {
          await sessionManager.endCurrentSession(true);
        }
      }
    } catch (e) {}

    await CastMediaService.stop();

    this.updateState({
      state: 'disconnected',
      connectedDevice: null,
      showPicker: false,
      errorMessage: null,
    });
    console.log('⏹️ Disconnected from TV');
  }

  /**
   * Retry discovery after connection failure
   */
  public async retry(): Promise<void> {
    await this.handleCastButtonPress();
  }

  /**
   * Close the device picker modal
   */
  public closePicker(): void {
    this.updateState({ showPicker: false });
  }

  /**
   * Cast a video or stream to the connected TV
   */
  public async castMedia(media: CastMediaPayload): Promise<boolean> {
    if (this.serviceState.state !== 'connected') {
      console.warn('⚠️ Cannot cast media: No TV connected');
      return false;
    }
    return await CastMediaService.loadMedia(media);
  }
}

export const CastService = CastServiceClass.getInstance();
