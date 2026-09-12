import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CastService, CastServiceState } from '../../services/cast/CastService';

interface CastButtonProps {
  variant?: 'icon' | 'compact' | 'full';
  color?: string;
  onPressOverride?: () => void;
  isTelugu?: boolean;
}

export const CastButton: React.FC<CastButtonProps> = ({
  variant = 'compact',
  color = '#6366f1',
  onPressOverride,
  isTelugu = false,
}) => {
  const [castState, setCastState] = useState<CastServiceState>(CastService.getState());

  useEffect(() => {
    const unsubscribe = CastService.addStateListener((state) => {
      setCastState(state);
    });
    return () => unsubscribe();
  }, []);

  const handlePress = () => {
    if (onPressOverride) {
      onPressOverride();
    } else {
      CastService.handleCastButtonPress();
    }
  };

  const { state, connectedDevice, errorMessage } = castState;

  // Variant 1: Pure Icon (for header action bar)
  if (variant === 'icon') {
    return (
      <TouchableOpacity onPress={handlePress} style={styles.iconBtn} activeOpacity={0.7}>
        {state === 'searching' || state === 'connecting' ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <MaterialCommunityIcons
            name={state === 'connected' ? 'cast-connected' : 'cast'}
            size={22}
            color={state === 'connected' ? '#4caf50' : state === 'error' ? '#ef4444' : color}
          />
        )}
      </TouchableOpacity>
    );
  }

  // Render Label & Icon for Compact / Full variants
  const getButtonContent = () => {
    switch (state) {
      case 'searching':
        return {
          icon: 'radar',
          text: isTelugu ? '🔍 TVల కోసం శోధిస్తోంది...' : '🔍 Searching for TVs...',
          textColor: color,
          bgColor: '#e0e7ff',
          loading: true,
        };
      case 'connecting':
        return {
          icon: 'progress-clock',
          text: isTelugu ? 'TVకి కనెక్ట్ చేస్తోంది...' : 'Connecting to TV...',
          textColor: color,
          bgColor: '#e0e7ff',
          loading: true,
        };
      case 'connected':
        const devName = connectedDevice?.name || 'Smart TV';
        return {
          icon: 'cast-connected',
          text: isTelugu ? `📺 ${devName}కి కనెక్ట్ అయింది` : `📺 Connected to ${devName}`,
          textColor: '#2e7d32',
          bgColor: '#e8f5e9',
          loading: false,
        };
      case 'error':
        return {
          icon: 'alert-circle-outline',
          text: isTelugu ? 'TVకి కనెక్ట్ చేయడం విఫలమైంది (మళ్లీ ప్రయత్నించండి)' : 'Unable to connect to TV (Tap to Retry)',
          textColor: '#c62828',
          bgColor: '#ffebee',
          loading: false,
        };
      case 'disconnected':
      default:
        return {
          icon: 'cast',
          text: isTelugu ? '📺 TV Cast' : '📺 Cast',
          textColor: '#374151',
          bgColor: '#f3f4f6',
          loading: false,
        };
    }
  };

  const content = getButtonContent();

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.buttonContainer, { backgroundColor: content.bgColor }]}
      activeOpacity={0.8}
    >
      {content.loading ? (
        <ActivityIndicator size="small" color={content.textColor} style={{ marginRight: 6 }} />
      ) : (
        <MaterialCommunityIcons
          name={content.icon as any}
          size={18}
          color={content.textColor}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[styles.buttonText, { color: content.textColor }]} numberOfLines={1}>
        {content.text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
