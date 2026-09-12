import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CastDeviceDiscovery, CastDeviceItem } from '../../services/cast/CastDeviceDiscovery';
import { CastService, CastServiceState } from '../../services/cast/CastService';
import { API_URL } from '../../constants/config';

interface CastDevicePickerProps {
  isTelugu?: boolean;
}

export const CastDevicePicker: React.FC<CastDevicePickerProps> = ({ isTelugu = false }) => {
  const [castState, setCastState] = useState<CastServiceState>(CastService.getState());
  const [serverUrl, setServerUrl] = useState<string | undefined>();
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [customTvName, setCustomTvName] = useState('');
  const [customTvIp, setCustomTvIp] = useState('');
  const [isRescanning, setIsRescanning] = useState(false);

  useEffect(() => {
    const unsubscribe = CastService.addStateListener((state) => {
      setCastState(state);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (castState.showPicker) {
      setServerUrl(CastDeviceDiscovery.getServerTvUrl() || `${API_URL}/tv.html`);
    }
  }, [castState.showPicker]);

  const { showPicker, discoveredDevices } = castState;

  if (!showPicker) return null;

  const handleSelectDevice = async (device: CastDeviceItem) => {
    await CastService.connectToDevice(device);
  };

  const handleClose = () => {
    CastService.closePicker();
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    await CastService.handleCastButtonPress();
    setIsRescanning(false);
  };

  const handleCopyTvUrl = () => {
    const url = serverUrl || `${API_URL}/tv.html`;
    try {
      Clipboard.setString(url);
      Alert.alert('Copied!', `Smart TV Web Receiver URL copied:\n${url}`);
    } catch (_) {
      Alert.alert('Smart TV Web URL', url);
    }
  };

  const handleShareTvUrl = async () => {
    const url = serverUrl || `${API_URL}/tv.html`;
    try {
      await Share.share({
        message: isTelugu
          ? ` SFGC స్మార్ట్ TV లైవ్ డిస్ప్లే లింక్:\n${url}`
          : `SFGC Smart TV Live Lyrics & Worship Stream Link:\n${url}`,
        title: 'Smart TV Worship Display Link',
      });
    } catch (_) {
      Clipboard.setString(url);
      Alert.alert('TV Link Copied', url);
    }
  };

  const handleOpenTvUrl = () => {
    const url = serverUrl || `${API_URL}/tv.html`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open ${url}`);
    });
  };

  const handleSaveCustomTv = async () => {
    if (!customTvName.trim() || !customTvIp.trim()) return;
    const newDev = {
      name: customTvName.trim(),
      ip: customTvIp.trim(),
      type: 'Custom Wi-Fi TV',
      isCustom: true,
    };
    try {
      const stored = await AsyncStorage.getItem('custom_tv_devices');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [newDev, ...existing];
      await AsyncStorage.setItem('custom_tv_devices', JSON.stringify(updated));

      CastDeviceDiscovery.addDiscoveredDevice({
        id: newDev.ip,
        name: newDev.name,
        hostAddress: newDev.ip,
        type: newDev.type,
        isCustom: true,
      });

      setCustomTvName('');
      setCustomTvIp('');
      setShowAddIpModal(false);
      Alert.alert(
        isTelugu ? 'TV జోడించబడింది' : 'Smart TV Added',
        isTelugu ? `${newDev.name} సరిగ్గా జోడించబడింది.` : `${newDev.name} (${newDev.ip}) successfully added.`
      );
      handleRescan();
    } catch (e) {}
  };

  return (
    <Modal visible={showPicker} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="television-guide" size={24} color="#6366f1" />
              <Text style={styles.titleText}>
                {isTelugu ? 'TVకి ప్రసారం చేయండి (Cast to TV)' : 'Cast to Smart TV / Receiver'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* TV Web Player Receiver Card */}
          <View style={styles.tvUrlCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.cardHeaderTitle}>📺 SMART TV WEB RECEIVER</Text>
              <Text style={styles.liveBadge}>READY</Text>
            </View>
            <Text style={styles.tvUrlText} numberOfLines={1}>
              {serverUrl || `${API_URL}/tv.html`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <TouchableOpacity style={styles.tvUrlBtn} onPress={handleCopyTvUrl}>
                <MaterialCommunityIcons name="content-copy" size={14} color="#6366f1" />
                <Text style={styles.tvUrlBtnText}>{isTelugu ? 'కాపీ' : 'Copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tvUrlBtn} onPress={handleShareTvUrl}>
                <MaterialCommunityIcons name="share-variant" size={14} color="#6366f1" />
                <Text style={styles.tvUrlBtnText}>{isTelugu ? 'షేర్' : 'Share'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tvUrlBtn, { backgroundColor: '#6366f1' }]} onPress={handleOpenTvUrl}>
                <MaterialCommunityIcons name="open-in-new" size={14} color="#fff" />
                <Text style={[styles.tvUrlBtnText, { color: '#fff' }]}>{isTelugu ? 'TVలో తెరువు' : 'Open TV'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.subtitleText}>
            {isTelugu
              ? 'ఏదైనా స్మార్ట్ టీవీ బ్రౌజర్‌లో పైన ఉన్న URLని తెరవండి లేదా క్రింద ఉన్న పరికరాన్ని ఎంచుకోండి:'
              : 'Open the URL on any Smart TV browser (LG, Samsung, Android TV) or select a TV device below:'}
          </Text>

          {/* List of Discovered Devices */}
          {discoveredDevices.length > 0 ? (
            <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
              {discoveredDevices.map((dev) => (
                <TouchableOpacity
                  key={dev.id}
                  style={[styles.deviceRow, dev.isLastConnected && styles.preferredDeviceRow]}
                  onPress={() => handleSelectDevice(dev)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="television"
                    size={26}
                    color={dev.isLastConnected ? '#6366f1' : '#475569'}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.deviceName, dev.isLastConnected && { color: '#6366f1' }]}>
                        {dev.name}
                      </Text>
                      {dev.isLastConnected && (
                        <View style={styles.recentBadge}>
                          <Text style={styles.recentBadgeText}>RECENT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.deviceSub}>
                      {dev.type || 'Smart TV'} {dev.hostAddress ? `• ${dev.hostAddress}` : ''}
                    </Text>
                  </View>

                  <MaterialCommunityIcons name="broadcast" size={18} color="#6366f1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="radar" size={28} color="#6366f1" />
              <Text style={styles.emptyText}>
                {isTelugu
                  ? 'కనెక్ట్ చేసిన TVలు ఇంకా ఏవీ కనుగొనబడలేదు. మీ TV బ్రౌజర్‌లో పైన ఉన్న URL తెరవండి లేదా TV IPని జోడించండి.'
                  : 'Scanning local Wi-Fi... Open the Web Receiver URL above on your Smart TV browser or add TV IP manually.'}
              </Text>
            </View>
          )}

          {/* Actions: Rescan Network & Add Custom TV IP */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={styles.actionBtnOutlined} onPress={handleRescan} disabled={isRescanning}>
              <MaterialCommunityIcons name="refresh" size={16} color="#6366f1" />
              <Text style={styles.actionBtnOutlinedText}>
                {isRescanning ? (isTelugu ? 'శోధిస్తోంది...' : 'Scanning...') : (isTelugu ? 'రిఫ్రెష్' : 'Rescan Wi-Fi')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnContained} onPress={() => setShowAddIpModal(true)}>
              <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
              <Text style={styles.actionBtnContainedText}>{isTelugu ? 'TV జోడించు' : 'Add TV IP'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal 2: Add Custom TV IP */}
        {showAddIpModal && (
          <View style={styles.innerModalCard}>
            <View style={styles.headerRow}>
              <Text style={styles.titleText}>📺 {isTelugu ? 'కస్టమ్ TV IP జోడించండి' : 'Add Custom Smart TV IP'}</Text>
              <TouchableOpacity onPress={() => setShowAddIpModal(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              {isTelugu
                ? 'మీ స్మార్ట్ టీవీ పేరు మరియు Wi-Fi IP చిరునామాను ఇక్కడ నమోదు చేయండి.'
                : 'Enter your Smart TV name and IP address on the local Wi-Fi network.'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isTelugu ? 'TV పేరు (ఉదా: Sanctuary TV)' : 'TV Name (e.g. Sanctuary TV)'}
              value={customTvName}
              onChangeText={setCustomTvName}
            />
            <TextInput
              style={styles.input}
              placeholder={isTelugu ? 'IP చిరునామా (ఉదా: 192.168.1.105)' : 'IP Address (e.g. 192.168.1.105)'}
              keyboardType="numeric"
              value={customTvIp}
              onChangeText={setCustomTvIp}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity style={[styles.actionBtnOutlined, { flex: 1 }]} onPress={() => setShowAddIpModal(false)}>
                <Text style={styles.actionBtnOutlinedText}>{isTelugu ? 'రద్దు' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnContained, { flex: 1 }, (!customTvName.trim() || !customTvIp.trim()) && { opacity: 0.5 }]}
                disabled={!customTvName.trim() || !customTvIp.trim()}
                onPress={handleSaveCustomTv}
              >
                <Text style={styles.actionBtnContainedText}>{isTelugu ? 'రక్షించు' : 'Save TV'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  tvUrlCard: {
    backgroundColor: '#f0f3ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338ca',
  },
  liveBadge: {
    backgroundColor: '#22c55e',
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tvUrlText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1b4b',
    marginVertical: 4,
  },
  tvUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tvUrlBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  deviceList: {
    maxHeight: 220,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  preferredDeviceRow: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  deviceSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  recentBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recentBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  actionBtnOutlined: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
    backgroundColor: '#ffffff',
  },
  actionBtnOutlinedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
  },
  actionBtnContained: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  actionBtnContainedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  innerModalCard: {
    position: 'absolute',
    width: '90%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 10,
  },
});
