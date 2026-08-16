import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Linking, Platform } from 'react-native';
import { Portal, Modal, Title, Paragraph, Button, Text, Avatar } from 'react-native-paper';
import Constants from 'expo-constants';
import { API_URL } from '../constants/config';

let Updates: any = null;
try {
  Updates = require('expo-updates');
} catch (e) {
  // expo-updates not available in dev mode
}

export interface AppVersionConfig {
  latestVersion: string;
  minVersion: string;
  forceUpdate: boolean;
  downloadUrl: string;
  updateNotes: string;
}

export default function AppUpdateModal() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isOtaUpdate, setIsOtaUpdate] = useState(false);
  const [updateConfig, setUpdateConfig] = useState<AppVersionConfig>({
    latestVersion: '1.0.0',
    minVersion: '1.0.0',
    forceUpdate: false,
    downloadUrl: 'https://sfgc-church.onrender.com',
    updateNotes: 'New version available with enhanced push notifications and live stream updates!',
  });

  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      // 1. Check Expo OTA Updates if enabled
      if (Updates?.checkForUpdateAsync && !__DEV__) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setIsOtaUpdate(true);
          setVisible(true);
          return;
        }
      }

      // 2. Check Backend Server App Version Config API
      const res = await fetch(`${API_URL}/api/config/app-version`);
      const data = await res.json();

      if (data.success && data.config) {
        const cfg: AppVersionConfig = data.config;
        setUpdateConfig(cfg);

        // Compare currentVersion vs latestVersion (SemVer logic)
        if (isVersionHigher(cfg.latestVersion, currentVersion)) {
          setVisible(true);
        }
      }
    } catch (err) {
      console.log('App update check notice:', err);
    }
  };

  // Helper to check if server version is higher than current installed version
  const isVersionHigher = (serverVer: string, localVer: string): boolean => {
    const s = serverVer.split('.').map(Number);
    const l = localVer.split('.').map(Number);
    for (let i = 0; i < Math.max(s.length, l.length); i++) {
      const sv = s[i] || 0;
      const lv = l[i] || 0;
      if (sv > lv) return true;
      if (sv < lv) return false;
    }
    return false;
  };

  const handleApplyUpdate = async () => {
    setUpdating(true);
    try {
      if (isOtaUpdate && Updates?.fetchUpdateAsync && Updates?.reloadAsync) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        // Open download link in browser or app store
        const targetUrl = updateConfig.downloadUrl || 'https://sfgc-church.onrender.com';
        await Linking.openURL(targetUrl);
      }
    } catch (err: any) {
      console.log('Error installing update:', err);
      Linking.openURL(updateConfig.downloadUrl || 'https://sfgc-church.onrender.com');
    } finally {
      setUpdating(false);
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={!updateConfig.forceUpdate}
        onDismiss={() => setVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <View style={styles.headerIcon}>
          <Avatar.Icon size={64} icon="party-popper" style={{ backgroundColor: '#e0e7ff' }} color="#6366f1" />
        </View>

        <Title style={styles.title}>🎉 New Update Available!</Title>
        <Text style={styles.versionBadge}>Version v{updateConfig.latestVersion}</Text>

        <Paragraph style={styles.notes}>
          {updateConfig.updateNotes || 'A new update is ready with fresh features, improved performance, and church announcements!'}
        </Paragraph>

        <View style={styles.actionRow}>
          {!updateConfig.forceUpdate && (
            <Button
              mode="outlined"
              style={styles.btnLater}
              textColor="#666666"
              onPress={() => setVisible(false)}
              disabled={updating}
            >
              Later
            </Button>
          )}

          <Button
            mode="contained"
            buttonColor="#6366f1"
            style={styles.btnUpdate}
            loading={updating}
            disabled={updating}
            onPress={handleApplyUpdate}
          >
            {updating ? 'Downloading...' : 'Update Now'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerIcon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  versionBadge: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  notes: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  btnLater: {
    flex: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
  },
  btnUpdate: {
    flex: 1,
    borderRadius: 12,
  },
});
