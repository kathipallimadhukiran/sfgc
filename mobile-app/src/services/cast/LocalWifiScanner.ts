let NetworkModule: any = null;
try {
  NetworkModule = require('expo-network');
} catch (e) {}

import { CastDeviceItem } from './CastDeviceDiscovery';

interface TVPortConfig {
  port: number;
  type: string;
  namePrefix: string;
  path?: string;
}

const TV_PORTS: TVPortConfig[] = [
  { port: 8008, type: 'Google Cast / Android TV', namePrefix: 'Google Cast TV', path: '/setup/eureka_info' },
  { port: 8001, type: 'Samsung Tizen Smart TV', namePrefix: 'Samsung Smart TV', path: '/api/v2/' },
  { port: 3000, type: 'LG webOS Smart TV', namePrefix: 'LG webOS TV' },
  { port: 8060, type: 'Roku TV', namePrefix: 'Roku TV', path: '/query/device-info' },
  { port: 5000, type: 'Church Web TV Receiver', namePrefix: 'Church Web Receiver TV', path: '/tv' },
];

export class LocalWifiScannerService {
  private static instance: LocalWifiScannerService;

  private constructor() {}

  public static getInstance(): LocalWifiScannerService {
    if (!LocalWifiScannerService.instance) {
      LocalWifiScannerService.instance = new LocalWifiScannerService();
    }
    return LocalWifiScannerService.instance;
  }

  /**
   * Get the current mobile device local IP address on Wi-Fi
   */
  public async getLocalIpAddress(): Promise<string | null> {
    try {
      if (NetworkModule && typeof NetworkModule.getIpAddressAsync === 'function') {
        const ip = await NetworkModule.getIpAddressAsync();
        if (ip && ip !== '127.0.0.1' && ip !== '0.0.0.0' && !ip.startsWith('fe80') && !ip.includes(':')) {
          return ip;
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Probe a single IP and port with low timeout
   */
  private async probeIpPort(ip: string, config: TVPortConfig, timeoutMs: number = 600): Promise<CastDeviceItem | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = `http://${ip}:${config.port}${config.path || ''}`;

    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || res.status === 401 || res.status === 403 || res.status === 404) {
        return {
          id: `${ip}:${config.port}`,
          name: `${config.namePrefix} (${ip})`,
          hostAddress: ip,
          type: config.type,
        };
      }
    } catch (err) {
      clearTimeout(timer);
    }
    return null;
  }

  /**
   * Perform local Wi-Fi subnet scanning across TV ports
   */
  public async scanSubnetForTvs(maxHostRange: number = 30): Promise<CastDeviceItem[]> {
    const localIp = await this.getLocalIpAddress();
    if (!localIp) return [];

    const ipParts = localIp.split('.');
    if (ipParts.length !== 4) return [];

    const subnetPrefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.`;
    const deviceLastOctet = parseInt(ipParts[3], 10);

    // Prioritize IP numbers close to the phone's IP address (e.g. +-15 IPs around phone)
    const targetOctets: number[] = [];
    for (let offset = 1; offset <= maxHostRange; offset++) {
      const high = deviceLastOctet + offset;
      const low = deviceLastOctet - offset;
      if (high > 1 && high < 255) targetOctets.push(high);
      if (low > 1 && low < 255) targetOctets.push(low);
    }

    const foundDevicesMap = new Map<string, CastDeviceItem>();
    const scanPromises: Promise<void>[] = [];

    // Scan target IP addresses across TV ports concurrently
    targetOctets.forEach((octet) => {
      const targetIp = `${subnetPrefix}${octet}`;
      TV_PORTS.forEach((config) => {
        scanPromises.push(
          this.probeIpPort(targetIp, config).then((dev) => {
            if (dev) {
              foundDevicesMap.set(dev.hostAddress || dev.id, dev);
            }
          })
        );
      });
    });

    await Promise.allSettled(scanPromises);
    return Array.from(foundDevicesMap.values());
  }
}

export const LocalWifiScanner = LocalWifiScannerService.getInstance();
