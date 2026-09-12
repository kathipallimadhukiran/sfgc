import AsyncStorage from '@react-native-async-storage/async-storage';
import CastContext, { Device } from 'react-native-google-cast';
import { apiClient } from '../apiClient';
import { LocalWifiScanner } from './LocalWifiScanner';

export interface CastDeviceItem {
  id: string;
  name: string;
  modelName?: string;
  hostAddress?: string;
  type?: string;
  connectedAt?: string;
  isLastConnected?: boolean;
  isCustom?: boolean;
  rawDevice?: Device;
}

export type DiscoveryResult =
  | { status: 'NONE'; serverTvUrl?: string }
  | { status: 'SINGLE'; device: CastDeviceItem; serverTvUrl?: string }
  | { status: 'MULTIPLE'; devices: CastDeviceItem[]; preferredDevice?: CastDeviceItem; serverTvUrl?: string };

const LAST_CONNECTED_TV_KEY = 'sfgc_last_connected_tv';

export class CastDeviceDiscoveryService {
  private static instance: CastDeviceDiscoveryService;
  private isScanning = false;
  private discoveredDevices: Map<string, CastDeviceItem> = new Map();
  private lastServerTvUrl: string | undefined;

  private constructor() {}

  public static getInstance(): CastDeviceDiscoveryService {
    if (!CastDeviceDiscoveryService.instance) {
      CastDeviceDiscoveryService.instance = new CastDeviceDiscoveryService();
    }
    return CastDeviceDiscoveryService.instance;
  }

  /**
   * Save the last successfully connected TV device to AsyncStorage
   */
  public async setLastConnectedDevice(device: CastDeviceItem): Promise<void> {
    try {
      await AsyncStorage.setItem(
        LAST_CONNECTED_TV_KEY,
        JSON.stringify({ id: device.id, name: device.name })
      );
    } catch (err) {
      console.warn('⚠️ Could not save last connected TV device:', err);
    }
  }

  /**
   * Retrieve the last connected TV device info
   */
  public async getLastConnectedDevice(): Promise<{ id: string; name: string } | null> {
    try {
      const stored = await AsyncStorage.getItem(LAST_CONNECTED_TV_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Perform universal multi-source TV discovery:
   * 1. Native Google Cast / Chromecast SDK devices
   * 2. Connected Sanctuary Smart TVs / Web Displays via backend Socket REST API
   * 3. Saved Custom TV IP devices on local Wi-Fi
   */
  public async discoverDevices(scanDurationMs: number = 2500): Promise<DiscoveryResult> {
    if (this.isScanning) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    this.isScanning = true;
    this.discoveredDevices.clear();

    const lastConnected = await this.getLastConnectedDevice();

    try {
      // Source 1: Native Google Cast SDK Discovery
      if (CastContext && typeof CastContext.getDiscoveryManager === 'function') {
        try {
          const discoveryManager = CastContext.getDiscoveryManager();
          if (discoveryManager) {
            if (typeof discoveryManager.startDiscovery === 'function') {
              await discoveryManager.startDiscovery();
            }
            if (typeof discoveryManager.getDevices === 'function') {
              const devices = await discoveryManager.getDevices();
              if (Array.isArray(devices)) {
                devices.forEach((d: Device) => {
                  if (d && (d.deviceId || d.friendlyName)) {
                    const id = d.deviceId || d.friendlyName;
                    this.discoveredDevices.set(id, {
                      id,
                      name: d.friendlyName || `Google Cast TV (${id})`,
                      modelName: d.modelName || 'Google Cast TV',
                      type: 'Google Cast / Chromecast',
                      rawDevice: d,
                    });
                  }
                });
              }
            }
          }
        } catch (nativeErr) {
          console.log('ℹ️ Google Cast native scanning note:', nativeErr);
        }
      }

      // Source 2: Backend Socket & Active Smart TV Web Displays
      try {
        const res = await apiClient.get('/api/stream/cast-info');
        if (res && res.success) {
          if (res.tvWebUrl) {
            this.lastServerTvUrl = res.tvWebUrl;
          }

          const backendDisplays = res.connectedDisplays || [];
          backendDisplays.forEach((d: any) => {
            const id = d.id || d.name;
            if (id && !this.discoveredDevices.has(id)) {
              this.discoveredDevices.set(id, {
                id,
                name: d.name || 'Smart TV Web Display',
                type: d.type || 'Smart TV Web Cast',
                hostAddress: d.ip || res.hostIp,
                connectedAt: d.connectedAt,
              });
            }
          });
        }
      } catch (backendErr) {
        console.log('ℹ️ Network TV cast-info fetch fallback note:', backendErr);
      }

      // Source 3: Saved Custom Wi-Fi TV Devices
      try {
        const storedCustom = await AsyncStorage.getItem('custom_tv_devices');
        if (storedCustom) {
          const customList = JSON.parse(storedCustom);
          if (Array.isArray(customList)) {
            customList.forEach((c: any) => {
              const id = c.ip || c.name;
              if (id && !this.discoveredDevices.has(id)) {
                this.discoveredDevices.set(id, {
                  id,
                  name: c.name,
                  hostAddress: c.ip,
                  type: c.type || 'Custom Wi-Fi TV',
                  isCustom: true,
                });
              }
            });
          }
        }
      } catch (customErr) {}

      // Source 4: Active Local Wi-Fi Subnet Scanner (Probing nearby TV ports on local Wi-Fi router)
      try {
        const wifiTvs = await LocalWifiScanner.scanSubnetForTvs();
        wifiTvs.forEach((dev) => {
          const id = dev.hostAddress || dev.id;
          if (id && !this.discoveredDevices.has(id)) {
            this.discoveredDevices.set(id, dev);
          }
        });
      } catch (wifiErr) {
        console.log('ℹ️ Local Wi-Fi subnet scanning note:', wifiErr);
      }

      // Short wait window for scanning completion
      await new Promise((resolve) => setTimeout(resolve, scanDurationMs));

      // Collect & mark last connected device
      const deviceList = Array.from(this.discoveredDevices.values());

      if (lastConnected) {
        deviceList.forEach((d) => {
          if (d.id === lastConnected.id || d.name === lastConnected.name) {
            d.isLastConnected = true;
          }
        });
      }

      this.isScanning = false;

      if (deviceList.length === 0) {
        return { status: 'NONE', serverTvUrl: this.lastServerTvUrl };
      }

      if (deviceList.length === 1) {
        return { status: 'SINGLE', device: deviceList[0], serverTvUrl: this.lastServerTvUrl };
      }

      const preferredDevice = deviceList.find((d) => d.isLastConnected);
      return {
        status: 'MULTIPLE',
        devices: deviceList,
        preferredDevice,
        serverTvUrl: this.lastServerTvUrl,
      };
    } catch (error) {
      this.isScanning = false;
      console.error('❌ Error during TV discovery:', error);
      return { status: 'NONE', serverTvUrl: this.lastServerTvUrl };
    }
  }

  public getServerTvUrl(): string | undefined {
    return this.lastServerTvUrl;
  }

  /**
   * Register a dynamically discovered device (e.g. from Socket.IO listener)
   */
  public addDiscoveredDevice(device: CastDeviceItem): void {
    if (device && device.id) {
      this.discoveredDevices.set(device.id, device);
    }
  }
}

export const CastDeviceDiscovery = CastDeviceDiscoveryService.getInstance();
