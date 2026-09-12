import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CastService, CastServiceState } from '../../services/cast/CastService';
import { CastPlaybackState, CastMediaService } from '../../services/cast/CastMediaService';

interface CastStatusProps {
  isTelugu?: boolean;
}

export const CastStatus: React.FC<CastStatusProps> = ({ isTelugu = false }) => {
  const [castState, setCastState] = useState<CastServiceState>(CastService.getState());
  const [playbackState, setPlaybackState] = useState<CastPlaybackState>(CastMediaService.getPlaybackState());

  useEffect(() => {
    const unsubCast = CastService.addStateListener((state) => setCastState(state));
    const unsubMedia = CastMediaService.addPlaybackListener((state) => setPlaybackState(state));
    return () => {
      unsubCast();
      unsubMedia();
    };
  }, []);

  const { state, connectedDevice } = castState;

  if (state !== 'connected' || !connectedDevice) return null;

  const handleDisconnect = async () => {
    await CastService.disconnect();
  };

  const handlePlayPause = async () => {
    if (playbackState.isPlaying) {
      await CastMediaService.pause();
    } else {
      await CastMediaService.play();
    }
  };

  return (
    <View style={styles.statusContainer}>
      <View style={styles.leftRow}>
        <View style={styles.liveIndicator}>
          <MaterialCommunityIcons name="cast-connected" size={20} color="#22c55e" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.connectedTitle} numberOfLines={1}>
            {isTelugu ? `${connectedDevice.name}కి కనెక్ట్ అయింది` : `Connected to ${connectedDevice.name}`}
          </Text>

          {playbackState.currentMedia ? (
            <Text style={styles.mediaTitle} numberOfLines={1}>
              {playbackState.isPlaying ? '▶ ' : '⏸ '}
              {playbackState.currentMedia.title}
            </Text>
          ) : (
            <Text style={styles.idleSubtitle}>
              {isTelugu ? 'మీడియా ప్రసారానికి సిద్ధంగా ఉంది' : 'Ready to cast worship media'}
            </Text>
          )}
        </View>
      </View>

      {/* Control Actions */}
      <View style={styles.rightActions}>
        {playbackState.currentMedia && (
          <TouchableOpacity style={styles.controlBtn} onPress={handlePlayPause}>
            <MaterialCommunityIcons
              name={playbackState.isPlaying ? 'pause' : 'play'}
              size={20}
              color="#ffffff"
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <MaterialCommunityIcons name="power" size={18} color="#ef4444" />
          <Text style={styles.disconnectText}>{isTelugu ? 'డిస్‌కనెక్ట్' : 'Disconnect'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  liveIndicator: {
    marginRight: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  connectedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  mediaTitle: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
  },
  idleSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    backgroundColor: '#6366f1',
    padding: 8,
    borderRadius: 20,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
});
