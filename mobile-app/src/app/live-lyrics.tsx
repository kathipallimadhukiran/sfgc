import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Platform, useWindowDimensions, Linking, TouchableOpacity } from 'react-native';
import { Text, Divider, Card } from 'react-native-paper';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LiveLyricsScreen() {
  const { liveSession, joinLiveSession, leaveLiveSession, language } = useApp();
  const isTel = language === 'Telugu';
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [zoomText, setZoomText] = useState(26);
  const theme = useTheme();

  const isLandscape = width > height;

  useEffect(() => {
    // Connect socket and join the active lyrics room
    joinLiveSession();
    return () => leaveLiveSession();
  }, []);

  const handleBack = () => {
    router.navigate('/songs');
  };

  if (!liveSession) {
    return (
      <View style={styles.emptyContainer}>
        {/* Floating Close Button */}
        <TouchableOpacity style={styles.iconCircleBtnFloating} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.centerMessage}>
          <MaterialCommunityIcons name="wifi-off" size={60} color="#bbb" />
          <Text style={styles.emptyTitle}>
            {isTel ? 'యాక్టివ్ లైవ్ ఆరాధన ఏదీ లేదు' : 'No Active Live Worship Stream'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isTel ? 'దయచేసి నిర్వాహకులు లేదా ఆరాధన బృందం లైవ్ లోకి వచ్చే వరకు వేచి ఉండండి.' : 'Please wait for the administrator or worship team to go live.'}
          </Text>
        </View>
      </View>
    );
  }

  const { song, currentSlideIndex, blackScreen, blankScreen, highlightedLineIndex } = liveSession;
  const activeSlide = song?.lyrics?.[currentSlideIndex];
  const lyricLines = activeSlide?.text?.split('\n') || [];

  return (
    <View style={styles.container}>
      
      {/* Floating Translucent Control Bar (True Fullscreen Layout) */}
      <View style={styles.floatingControls}>
        <TouchableOpacity style={styles.iconCircleBtn} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.rightControlsRow}>
          <TouchableOpacity style={[styles.iconCircleBtn, { marginRight: 10 }]} onPress={() => setZoomText(Math.max(16, zoomText - 4))}>
            <MaterialCommunityIcons name="magnify-minus" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconCircleBtn} onPress={() => setZoomText(Math.min(48, zoomText + 4))}>
            <MaterialCommunityIcons name="magnify-plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Slide Presentation display viewport */}
      <View style={[styles.lyricsViewport, isLandscape && styles.fullViewport]}>
        {blackScreen ? (
          <View style={styles.blackoutOverlay}>
            <Text style={styles.mutedText}>{isTel ? 'ప్రొజెక్షన్ స్క్రీన్ బ్లాక్అవుట్' : 'Projection Screen Blackout'}</Text>
          </View>
        ) : blankScreen ? (
          <View style={styles.blankOverlay}>
            <Text style={[styles.mutedText, { color: 'rgba(255,255,255,0.4)' }]}>
              {isTel ? '[ఆపరేటర్ ద్వారా సాహిత్యం దాచబడింది]' : '[Lyrics Blanked out by Operator]'}
            </Text>
          </View>
        ) : (
          <View style={styles.activeLyricsContainer}>
            <Text style={styles.slideType}>{activeSlide?.type || 'Verse'}</Text>
            
            <View style={styles.linesList}>
              {lyricLines.map((line: string, index: number) => {
                const isHighlighted = highlightedLineIndex === index;
                return (
                  <Text
                    key={index}
                    style={[
                      styles.lyricsText,
                      { fontSize: zoomText },
                      isHighlighted && styles.highlightedText
                    ]}
                  >
                    {line}
                  </Text>
                );
              })}
            </View>

            {/* YouTube Live Stream Link Button */}
            {song?.youtubeLink ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.youtubeBtn}
                onPress={() => Linking.openURL(song.youtubeLink)}
              >
                <MaterialCommunityIcons name="youtube" size={22} color="#ff0000" />
                <Text style={styles.youtubeBtnText}>{isTel ? 'లైవ్ ప్రసార వీడియో చూడండి' : 'Watch Live Stream Video'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* Small indicator hint shown at bottom if portrait */}
      {!isLandscape && (
        <Card style={styles.helperCard}>
          <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
            <MaterialCommunityIcons name="screen-rotation" size={18} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '500' }}>
              {isTel ? 'చిట్కా: పూర్తి స్క్రీన్ ప్రొజెక్షన్ లేఅవుట్ కోసం పరికరాన్ని అడ్డంగా తిప్పండి.' : 'Tip: Rotate device to Landscape for full screen projection layout.'}
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0915',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  centerMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  iconCircleBtnFloating: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  rightControlsRow: {
    flexDirection: 'row',
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0b1e', // Peaceful Deep Dark Indigo
    padding: 24,
  },
  fullViewport: {
    padding: 10,
  },
  activeLyricsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  slideType: {
    color: '#ffd54f', // Amber/gold for slide type
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
    fontSize: 14,
  },
  linesList: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  lyricsText: {
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 40,
    fontWeight: '600',
  },
  highlightedText: {
    color: '#ffd54f', // bright warm amber highlight
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  blackoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blankOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8e0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedText: {
    color: '#ffffff',
    opacity: 0.6,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  youtubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 40,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  youtubeBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helperCard: {
    margin: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 1,
  }
});
