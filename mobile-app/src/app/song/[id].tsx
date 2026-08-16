import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, View, Platform, Share, Dimensions, TouchableOpacity } from 'react-native';
import { Appbar, Card, Title, Paragraph, Button, Text, ToggleButton, IconButton, Divider, Snackbar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { songsService } from '@/services/songsService';

export default function SongDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const { favorites, toggleFavorite, songs, user, addToSetlist, language } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const [song, setSong] = useState<any>(null);
  const [viewMode, setViewMode] = useState('lyrics'); // 'lyrics' or 'chords'
  const [fontSize, setFontSize] = useState(16);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const isTel = language === 'Telugu';

  const AUTHORIZED_ROLES = ['Admin', 'Super Admin', 'Worship Leader', 'Choir Leader', 'Media Team'];
  const canOperate = user && AUTHORIZED_ROLES.includes(user.role);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollIntervalRef = useRef<any>(null);
  const currentScrollY = useRef(0);

  useEffect(() => {
    const fetchSongDetails = async () => {
      if (!id) return;
      try {
        const res = await songsService.getSongById(id as string);
        if (res.success && res.song) {
          setSong(res.song);
          return;
        }
      } catch (err) {
        console.log('Error fetching song details from service:', err);
      }
      // Fallback to context songs
      const cached = songs.find((s: any) => s._id === id || s.id === id);
      if (cached) {
        setSong(cached);
      }
    };
    fetchSongDetails();
  }, [id, songs]);

  // Auto Scroll logic
  useEffect(() => {
    if (autoScrollActive) {
      scrollIntervalRef.current = setInterval(() => {
        if (scrollViewRef.current) {
          currentScrollY.current += 1.5;
          scrollViewRef.current.scrollTo({ y: currentScrollY.current, animated: true });
        }
      }, 50);
    } else {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    }

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [autoScrollActive]);

  const handleShare = async () => {
    if (!song) return;
    const lyricsText = song.lyrics?.map((s: any) => `*${s.type}*\n${s.text}`).join('\n\n');
    try {
      await Share.share({
        message: `*${song.title}* (${song.language})\n\n${lyricsText}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleAddToSetlist = () => {
    if (!song) return;
    addToSetlist(song);
    setSnackMsg(isTel ? `"${song.title}" సేవా జాబితాకు జోడించబడింది.` : `"${song.title}" added to service setlist.`);
    setSnackVisible(true);
  };

  const handleGoLive = () => {
    if (!song) return;
    router.push({ pathname: '/live-operator', params: { songId: song._id || song.id, returnTo: `/song/${song._id || song.id}` } });
  };

  const handleScrollStateToggle = () => {
    setAutoScrollActive(!autoScrollActive);
    if (!autoScrollActive) {
      currentScrollY.current = 0; // reset scroll to top on toggle on
    }
  };

  const handleGoBack = () => {
    if (returnTo) {
      router.replace(returnTo as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/songs');
    }
  };

  if (!song) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 12 }}>
          {isTel ? 'పాట సాహిత్యం లోడ్ అవుతోంది...' : 'Loading song lyrics...'}
        </Text>
      </View>
    );
  }

  const isFavorite = favorites.includes(song._id || song.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header bar */}
      <Appbar.Header style={{ backgroundColor: theme.primary }}>
        <Appbar.BackAction color="#fff" onPress={handleGoBack} />
        <Appbar.Content title={song.title} color="#fff" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action
          color="#fff"
          icon={isFavorite ? 'heart' : 'heart-outline'}
          onPress={() => toggleFavorite(song._id || song.id)}
        />
        {canOperate && (
          <>
            <Appbar.Action
              color="#fff"
              icon="pencil"
              onPress={() => router.push({ pathname: '/song-editor', params: { editId: song._id || song.id, returnTo: `/song/${song._id || song.id}` } })}
            />
            <Appbar.Action color="#ffd54f" icon="playlist-plus" onPress={handleAddToSetlist} />
          </>
        )}
        <Appbar.Action color="#fff" icon="share-variant" onPress={handleShare} />
      </Appbar.Header>

      {/* Control bar */}
      <View style={[styles.controlBar, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.fontSizeControls}>
          <IconButton icon="format-size" size={20} iconColor={theme.textSecondary} />
          <IconButton icon="minus" size={16} iconColor={theme.text} onPress={() => setFontSize(Math.max(12, fontSize - 2))} />
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{fontSize}</Text>
          <IconButton icon="plus" size={16} iconColor={theme.text} onPress={() => setFontSize(Math.min(30, fontSize + 2))} />
        </View>

        <ToggleButton.Row onValueChange={value => value && setViewMode(value)} value={viewMode}>
          <ToggleButton icon="text" value="lyrics" iconColor={viewMode === 'lyrics' ? theme.primary : theme.textSecondary} />
          <ToggleButton icon="music-clef-treble" value="chords" iconColor={viewMode === 'chords' ? theme.primary : theme.textSecondary} />
        </ToggleButton.Row>
      </View>

      {/* Main Lyrics & Chords Scroll Body */}
      <ScrollView 
        ref={scrollViewRef} 
        style={styles.scrollView}
        onScroll={(e) => { currentScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <Card style={[styles.lyricCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Card.Content>
            {viewMode === 'lyrics' ? (
              song.lyrics?.map((slide: any, idx: number) => (
                <View key={idx} style={styles.slideContainer}>
                  <Text style={[styles.slideType, { color: theme.primary }]}>{slide.type}</Text>
                  <Text style={[styles.lyricsText, { fontSize, color: theme.text }]}>
                    {slide.text}
                  </Text>
                  {idx < song.lyrics.length - 1 && <Divider style={{ marginVertical: 15, backgroundColor: theme.cardBorder }} />}
                </View>
              ))
            ) : (
              <ScrollView horizontal>
                <Text style={[styles.chordsText, { fontSize, color: theme.text }]}>
                  {song.chords || 'No guitar chords configured for this song.'}
                </Text>
              </ScrollView>
            )}
          </Card.Content>
        </Card>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Go Live FAB for authorized roles */}
      {canOperate && (
        <TouchableOpacity style={styles.goLiveFab} onPress={handleGoLive}>
          <MaterialCommunityIcons name="broadcast" size={20} color="#fff" />
          <Text style={styles.goLiveFabText}>
            {isTel ? 'లైవ్‌కి వెళ్ళు' : 'Go Live'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Snackbar */}
      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2500}
        style={{ backgroundColor: '#1e1e3f' }}
      >
        <Text style={{ color: '#fff', fontSize: 13 }}>{snackMsg}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  lyricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  slideContainer: {
    marginVertical: 10,
  },
  slideType: {
    color: '#e91e63',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  lyricsText: {
    lineHeight: 28,
    color: '#222',
  },
  chordsText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 24,
    color: '#333',
  },
  goLiveFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 14,
    elevation: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  goLiveFabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
