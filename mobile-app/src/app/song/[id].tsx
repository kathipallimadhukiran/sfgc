import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, View, Platform, Share, Dimensions } from 'react-native';
import { Appbar, Card, Title, Paragraph, Button, Text, ToggleButton, IconButton, Divider } from 'react-native-paper';
import { useApp } from '@/context/AppContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { songsService } from '@/services/songsService';

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams();
  const { favorites, toggleFavorite, songs } = useApp();
  const router = useRouter();
  const [song, setSong] = useState<any>(null);
  const [viewMode, setViewMode] = useState('lyrics'); // 'lyrics' or 'chords'
  const [fontSize, setFontSize] = useState(16);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  
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

  const handleCopy = () => {
    if (!song) return;
    // Simple clipboard trigger or alert for demonstration
    const lyricsText = song.lyrics?.map((s: any) => `[${s.type}]\n${s.text}`).join('\n\n');
    alert('Lyrics copied to clipboard!');
  };

  const handleScrollStateToggle = () => {
    setAutoScrollActive(!autoScrollActive);
    if (!autoScrollActive) {
      currentScrollY.current = 0; // reset scroll to top on toggle on
    }
  };

  if (!song) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading song lyrics...</Text>
      </View>
    );
  }

  const isFavorite = favorites.includes(song._id);

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <Appbar.Header style={{ backgroundColor: '#c62828' }}>
        <Appbar.BackAction color="#fff" onPress={() => router.back()} />
        <Appbar.Content title={song.title} color="#fff" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action 
          color="#fff" 
          icon={isFavorite ? 'heart' : 'heart-outline'} 
          onPress={() => toggleFavorite(song._id)} 
        />
        <Appbar.Action color="#fff" icon="share-variant" onPress={handleShare} />
      </Appbar.Header>

      {/* Control bar */}
      <View style={styles.controlBar}>
        <View style={styles.fontSizeControls}>
          <IconButton icon="format-size" size={20} />
          <IconButton icon="minus" size={16} onPress={() => setFontSize(Math.max(12, fontSize - 2))} />
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{fontSize}</Text>
          <IconButton icon="plus" size={16} onPress={() => setFontSize(Math.min(30, fontSize + 2))} />
        </View>

        <ToggleButton.Row onValueChange={value => value && setViewMode(value)} value={viewMode}>
          <ToggleButton icon="text" value="lyrics" />
          <ToggleButton icon="music-clef-treble" value="chords" />
        </ToggleButton.Row>

        <IconButton 
          icon={autoScrollActive ? 'pause-circle' : 'play-circle'} 
          iconColor="#c62828" 
          size={30} 
          onPress={handleScrollStateToggle} 
        />
      </View>

      {/* Main Lyrics & Chords Scroll Body */}
      <ScrollView 
        ref={scrollViewRef} 
        style={styles.scrollView}
        onScroll={(e) => { currentScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <Card style={styles.lyricCard}>
          <Card.Content>
            {viewMode === 'lyrics' ? (
              song.lyrics?.map((slide: any, idx: number) => (
                <View key={idx} style={styles.slideContainer}>
                  <Text style={styles.slideType}>{slide.type}</Text>
                  <Text style={[styles.lyricsText, { fontSize }]}>
                    {slide.text}
                  </Text>
                  {idx < song.lyrics.length - 1 && <Divider style={{ marginVertical: 15 }} />}
                </View>
              ))
            ) : (
              <ScrollView horizontal>
                <Text style={[styles.chordsText, { fontSize }]}>
                  {song.chords || 'No guitar chords configured for this song.'}
                </Text>
              </ScrollView>
            )}
          </Card.Content>
        </Card>
        <View style={{ height: 100 }} />
      </ScrollView>
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
  }
});
