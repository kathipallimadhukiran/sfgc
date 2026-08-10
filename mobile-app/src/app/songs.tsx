import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, ScrollView, Platform, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { Searchbar, Card, Title, Text, Chip, List, Banner, IconButton, Divider, Portal, Modal, Button, FAB, HelperText } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { songsService } from '@/services/songsService';
import { VoiceSearchModal } from '@/components/VoiceSearchModal';

const CATEGORIES = [
  'Worship Songs', 'Christmas Songs', 'Easter Songs', 'Good Friday Songs',
  'Offering Songs', 'Youth Songs', 'Healing Prayer Songs', 'Fasting Prayer Songs',
  'Revival Songs', 'Communion Songs', 'Baptism Songs', 'Special Event Songs'
];

export default function SongsScreen() {
  const { songs, favorites, toggleFavorite, liveSession, refreshData, user, token, language } = useApp();
  const isTel = language === 'Telugu';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [voiceSearchActive, setVoiceSearchActive] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState<'Telugu' | 'English'>('Telugu');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const micStreamRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);

  const router = useRouter();
  const theme = useTheme();

  // Add/Edit Song Form states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState('Telugu');
  const [newCat, setNewCat] = useState('Worship Songs');
  const [newYoutube, setNewYoutube] = useState('');
  const [newChords, setNewChords] = useState('');
  const [newLyrics, setNewLyrics] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.log('Error refreshing songs:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshData();
    }, [])
  );

  useEffect(() => {
    refreshData();
    setVoiceLanguage(isTel ? 'Telugu' : 'English');
    // Load recent song searches
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('songs_recent_searches');
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (e) {
        console.log('Error loading recent song searches:', e);
      }
    })();

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach((t: any) => t.stop()); } catch (e) {}
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  const saveRecentSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 10);
        AsyncStorage.setItem('songs_recent_searches', JSON.stringify(updated)).catch(console.log);
        return updated;
      });
    } catch (e) {
      console.log('Error saving recent song search:', e);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('songs_recent_searches');
    } catch (e) {
      console.log('Error clearing recent song searches:', e);
    }
  };

  const getTranslatedCategory = (cat: string) => {
    if (!isTel) return cat;
    switch(cat) {
      case 'Worship Songs': return 'ఆరాధన గీతాలు';
      case 'Christmas Songs': return 'క్రిస్మస్ పాటలు';
      case 'Easter Songs': return 'ఈస్టర్ పాటలు';
      case 'Good Friday Songs': return 'గుడ్ ఫ్రైడే పాటలు';
      case 'Offering Songs': return 'కానుకల పాటలు';
      case 'Youth Songs': return 'యూత్ సాంగ్స్';
      case 'Healing Prayer Songs': return 'స్వస్థత ప్రార్థన పాటలు';
      case 'Fasting Prayer Songs': return 'ఉపవాస ప్రార్థన పాటలు';
      case 'Revival Songs': return 'ఉజ్జీవ కూడిక పాటలు';
      case 'Communion Songs': return 'ప్రభు రాత్రి భోజన పాటలు';
      case 'Baptism Songs': return 'బాప్తిస్మపు పాటలు';
      case 'Special Event Songs': return 'ప్రత్యేక కూడిక పాటలు';
      default: return cat;
    }
  };

  const handleExecuteVoiceSearch = (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;
    saveRecentSearch(cleanQuery);
    setVoiceSearchActive(false);
    setSearchQuery(cleanQuery);
  };

  const handleVoiceSearch = () => {
    setVoiceSearchActive(true);
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (song.tags && song.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesLang = !selectedLanguage || song.language === selectedLanguage;
    const matchesCat = !selectedCategory || song.category === selectedCategory;

    return matchesSearch && matchesLang && matchesCat;
  });

  const activeSlide = liveSession?.song?.lyrics?.[liveSession?.currentSlideIndex];
  const lyricLines = activeSlide?.text?.split('\n') || [];
  const highlightedLineIndex = liveSession?.highlightedLineIndex;

  // Authorization check for adding, editing and deleting lyrics
  const canManageSongs = user && ['Admin', 'Super Admin', 'Worship Leader', 'Choir Leader', 'Media Team'].includes(user.role);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNewTitle('');
    setNewLang('Telugu');
    setNewCat('Worship Songs');
    setNewYoutube('');
    setNewChords('');
    setNewLyrics('');
    setAddModalVisible(true);
  };

  const handleOpenEditModal = (song: any) => {
    setEditingId(song._id);
    setNewTitle(song.title);
    setNewLang(song.language);
    setNewCat(song.category);
    setNewYoutube(song.youtubeLink || '');
    setNewChords(song.chords || '');
    
    // Format lyrics from slides back to double-newline text block
    const lyricsText = song.lyrics?.map((s: any) => s.text).join('\n\n');
    setNewLyrics(lyricsText || '');
    
    setAddModalVisible(true);
  };

  const handleDeleteSong = (songId: string, title: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete song "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await songsService.deleteSong(songId);
              if (response.success) {
                alert('🎉 Song deleted successfully!');
                refreshData();
              } else {
                alert(`Error deleting song: ${response.message || 'Failed to delete'}`);
              }
            } catch (err: any) {
              alert(`Error deleting song: ${err.message}`);
            }
          }
        }
      ]
    );
  };

  const handleAddSongSubmit = async () => {
    if (!newTitle || !newLyrics) {
      alert('Please enter a Title and Lyrics.');
      return;
    }
    
    setSubmitting(true);
    try {
      // Split lyrics by double-newline to generate slides
      const slides = newLyrics.split('\n\n').map((block, idx) => {
        let type = `Verse ${idx + 1}`;
        if (block.toLowerCase().startsWith('chorus:\n') || block.toLowerCase().startsWith('chorus:')) {
          type = 'Chorus';
          block = block.replace(/^chorus:?\n?/i, '');
        } else if (idx === 1) {
          type = 'Chorus';
        }
        return { type, text: block.trim() };
      });

      const payload = {
        title: newTitle,
        language: newLang as 'Telugu' | 'English',
        category: newCat,
        youtubeLink: newYoutube,
        chords: newChords,
        lyrics: slides,
        tags: [newLang.toLowerCase(), newCat.toLowerCase()]
      };

      let response;
      if (editingId) {
        response = await songsService.updateSong(editingId, payload);
      } else {
        response = await songsService.addSong(payload);
      }

      if (response.success) {
        alert(editingId ? '🎉 Song lyrics updated successfully!' : '🎉 Song lyrics added successfully!');
        setNewTitle('');
        setNewYoutube('');
        setNewChords('');
        setNewLyrics('');
        setEditingId(null);
        setAddModalVisible(false);
        refreshData();
      } else {
        alert(`Failed to save song: ${response.message || 'Error'}`);
      }
    } catch (err: any) {
      console.log('Save song error:', err);
      alert(`Error saving song: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal.Host>
      <View style={styles.container}>
        {/* Live Worship Banner / Preview card */}
        <Card 
          style={[styles.liveWidgetCard, liveSession && styles.liveWidgetCardActive]}
          onPress={() => router.push('/live-lyrics')}
        >
          <Card.Content style={styles.liveWidgetContent}>
            <View style={styles.liveWidgetHeader}>
              <View style={styles.liveHeaderLeft}>
                <View style={[styles.glowingDot, { backgroundColor: liveSession ? '#4caf50' : '#ffeb3b' }]} />
                <Text style={styles.liveWidgetTitle}>
                  {liveSession 
                    ? (isTel ? 'లైవ్ ఆరాధన ప్రదర్శన (యాక్టివ్)' : 'LIVE WORSHIP DISPLAY (ACTIVE)') 
                    : (isTel ? 'లైవ్ ఆరాధన ప్రదర్శన (స్టాండ్‌బై)' : 'LIVE WORSHIP DISPLAY (STANDBY)')}
                </Text>
              </View>
              {liveSession && (
                <IconButton 
                  icon="fullscreen" 
                  iconColor="#ffffff" 
                  size={20} 
                  style={{ margin: 0, padding: 0 }} 
                />
              )}
            </View>

            {liveSession ? (
              liveSession.blackScreen ? (
                <View style={styles.widgetLyricsBoxBlack}>
                  <Text style={styles.blackoutText}>
                    {isTel ? 'డిస్ప్లే నిలిపివేయబడింది (బ్లాక్అవుట్)' : 'DISPLAY BLACKED OUT'}
                  </Text>
                </View>
              ) : liveSession.blankScreen ? (
                <View style={styles.widgetLyricsBoxBlank}>
                  <Text style={styles.blankText}>
                    {isTel ? 'ఖాళీ డిస్ప్లే (బ్యాక్‌గ్రౌండ్ మాత్రమే)' : 'DISPLAY BLANK (BACKGROUND ONLY)'}
                  </Text>
                </View>
              ) : (
                <View style={styles.widgetLyricsBox}>
                  <Text style={styles.widgetSongTitle}>
                    🎵 {liveSession.song?.title} ({activeSlide?.type || 'Verse'})
                  </Text>
                  {lyricLines.slice(0, 3).map((line: string, idx: number) => {
                    const isHighlighted = highlightedLineIndex === idx;
                    return (
                      <Text 
                        key={idx} 
                        style={[
                          styles.widgetLyricLine, 
                          isHighlighted && styles.widgetLyricLineHighlight
                        ]}
                      >
                        {line}
                      </Text>
                    );
                  })}
                  {lyricLines.length > 3 && (
                    <Text style={[styles.widgetLyricLine, { opacity: 0.6, fontStyle: 'italic', fontSize: 13 }]}>
                      {isTel ? '... [మిగిలినవి చూడటానికి ఇక్కడ నొక్కండి]' : '... [Tap to see remaining lines]'}
                    </Text>
                  )}
                </View>
              )
            ) : (
              <View style={styles.widgetStandbyBox}>
                <MaterialCommunityIcons name="television-play" size={32} color="rgba(255,255,255,0.7)" style={{ marginBottom: 6 }} />
                <Text style={styles.standbyTitle}>
                  {isTel ? 'యాక్టివ్ లైవ్ ఆరాధన ఏదీ లేదు' : 'No Active Live Worship Stream'}
                </Text>
                <Text style={styles.standbySubtitle}>
                  {isTel ? 'కనెక్ట్ చేయడానికి & పూర్తి ప్రొజెక్షన్ స్క్రీన్‌ను తెరవడానికి ఇక్కడ నొక్కండి.' : 'Tap here to connect & open full screen projection display.'}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <Searchbar
              placeholder={isTel ? 'పాటలు లేదా కీవర్డ్స్ శోధించండి...' : 'Search songs or keywords...'}
              onChangeText={setSearchQuery}
              value={searchQuery}
              icon="magnify"
              clearIcon="close"
              style={styles.searchbar}
              inputStyle={{ fontSize: 14 }}
            />
            <IconButton 
              icon="microphone" 
              onPress={handleVoiceSearch} 
              mode="contained"
              containerColor={theme.primary}
              iconColor="#ffffff"
              style={styles.micButton}
            />
          </View>
        </View>

        {/* Language Quick Filters */}
        <View style={styles.filterRow}>
          <Chip
            selected={selectedLanguage === null}
            onPress={() => setSelectedLanguage(null)}
            style={[styles.chip, selectedLanguage === null && styles.activeChip]}
            textStyle={[styles.chipText, selectedLanguage === null && styles.activeChipText]}
            showSelectedOverlay={false}
          >
            {isTel ? 'అన్ని భాషలు' : 'All Languages'}
          </Chip>
          <Chip
            selected={selectedLanguage === 'English'}
            onPress={() => setSelectedLanguage('English')}
            style={[styles.chip, selectedLanguage === 'English' && styles.activeChip]}
            textStyle={[styles.chipText, selectedLanguage === 'English' && styles.activeChipText]}
            showSelectedOverlay={false}
          >
            {isTel ? 'ఇంగ్లీష్' : 'English'}
          </Chip>
          <Chip
            selected={selectedLanguage === 'Telugu'}
            onPress={() => setSelectedLanguage('Telugu')}
            style={[styles.chip, selectedLanguage === 'Telugu' && styles.activeChip]}
            textStyle={[styles.chipText, selectedLanguage === 'Telugu' && styles.activeChipText]}
            showSelectedOverlay={false}
          >
            {isTel ? 'తెలుగు' : 'Telugu'}
          </Chip>
        </View>

        {/* Scrollable Categories List */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <Chip
                  key={cat}
                  selected={isSelected}
                  onPress={() => setSelectedCategory(isSelected ? null : cat)}
                  style={[styles.categoryChip, isSelected && styles.activeCategoryChip]}
                  textStyle={[styles.categoryChipText, isSelected && styles.activeCategoryChipText]}
                  showSelectedOverlay={false}
                >
                  {getTranslatedCategory(cat)}
                </Chip>
              );
            })}
          </ScrollView>
        </View>

        {/* Songs FlatList */}
        <FlatList
          data={filteredSongs}
          keyExtractor={(item, index) => item._id || item.id || `song_${index}`}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => {
            const songKey = item._id || item.id || '';
            const isFav = favorites.includes(songKey);
            const isLive = liveSession && (liveSession.song?._id === songKey || liveSession.song?.id === songKey);
            
            return (
              <View style={[styles.songCard, isLive && styles.liveSongCard]}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => router.push(isLive ? '/live-lyrics' : `/song/${songKey}`)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={[styles.songIconBox, isLive && styles.liveSongIconBox]}>
                    <MaterialCommunityIcons 
                      name={isLive ? "radio-tower" : "music-clef-treble"} 
                      size={24} 
                      color={isLive ? "#ffffff" : theme.primary} 
                    />
                  </View>
                  <View style={styles.songDetails}>
                    <View style={styles.titleRow}>
                      <Text style={styles.songTitle}>{item.title}</Text>
                      {isLive && (
                        <View style={styles.liveTagBadge}>
                          <Text style={styles.liveTagText}>LIVE</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.songTagsRow}>
                      <Text style={styles.songLangTag}>
                        {item.language === 'Telugu' ? (isTel ? 'తెలుగు' : 'Telugu') : (isTel ? 'ఇంగ్లీష్' : 'English')}
                      </Text>
                      <Text style={styles.songDot}>•</Text>
                      <Text style={styles.songCatTag}>{getTranslatedCategory(item.category)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconButton
                    icon={isFav ? 'heart' : 'heart-outline'}
                    iconColor={isFav ? '#e91e63' : (isLive ? '#fff' : '#757575')}
                    size={20}
                    onPress={() => toggleFavorite(songKey)}
                    style={{ margin: 0 }}
                  />
                  {canManageSongs && (
                    <>
                      <IconButton
                        icon="pencil"
                        iconColor={isLive ? '#fff' : theme.primary}
                        size={18}
                        onPress={() => handleOpenEditModal(item)}
                        style={{ margin: 0 }}
                      />
                      <IconButton
                        icon="delete"
                        iconColor={isLive ? '#fff' : '#d32f2f'}
                        size={18}
                        onPress={() => handleDeleteSong(songKey, item.title)}
                        style={{ margin: 0 }}
                      />
                    </>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="music-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {isTel ? 'శోధనకు సరిపోయే ఆరాధన పాటలేవీ కనుగొనబడలేదు.' : 'No worship songs found matching your search filters.'}
              </Text>
            </View>
          }
        />

        {/* Floating Action Button for Song Addition (Authorized roles only) */}
        {canManageSongs && (
          <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.primary }]}
            color="#ffffff"
            onPress={handleOpenAddModal}
          />
        )}

        {/* Add/Edit Song Modal Overlay */}
        <Portal>
          <Modal
            visible={addModalVisible}
            onDismiss={() => setAddModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Title style={styles.modalTitle}>
                {editingId ? 'Edit Chords & Lyrics' : 'Add Chords & Lyrics'}
              </Title>

              <Text style={styles.inputLabel}>Song Title *</Text>
              <TextInput
                placeholder="e.g., Hosanna in the highest"
                placeholderTextColor="#666666"
                value={newTitle}
                onChangeText={setNewTitle}
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Language</Text>
              <View style={styles.rowSelector}>
                {['Telugu', 'English'].map(lang => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.selectorChip, newLang === lang && styles.selectorChipActive]}
                    onPress={() => setNewLang(lang)}
                  >
                    <Text style={[styles.selectorChipText, newLang === lang && styles.selectorChipTextActive]}>
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.selectorChip, newCat === cat && styles.selectorChipActive]}
                      onPress={() => setNewCat(cat)}
                    >
                      <Text style={[styles.selectorChipText, newCat === cat && styles.selectorChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.inputLabel}>YouTube Link (Optional)</Text>
              <TextInput
                placeholder="e.g. https://youtube.com/watch?v=..."
                placeholderTextColor="#666666"
                value={newYoutube}
                onChangeText={setNewYoutube}
                style={styles.textInput}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Guitar Chords Sheet (Optional)</Text>
              <TextInput
                placeholder="e.g. G       C       D..."
                placeholderTextColor="#666666"
                value={newChords}
                onChangeText={setNewChords}
                multiline
                numberOfLines={3}
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
              />

              <Text style={styles.inputLabel}>Lyrics (Slide Block Selector) *</Text>
              <Text style={{ fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 2 }}>
                Separate each slide/verse block with a blank line (press Enter twice).
              </Text>
              <TextInput
                placeholder="Line 1 of verse 1&#10;Line 2 of verse 1&#10;&#10;Chorus line 1&#10;Chorus line 2"
                placeholderTextColor="#666666"
                value={newLyrics}
                onChangeText={setNewLyrics}
                multiline
                numberOfLines={6}
                style={[styles.textInput, { height: 120, textAlignVertical: 'top' }]}
              />

              <View style={styles.modalActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => setAddModalVisible(false)} 
                  style={{ flex: 1, marginRight: 8, borderRadius: 8 }}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleAddSongSubmit} 
                  loading={submitting}
                  disabled={submitting}
                  buttonColor={theme.primary}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  Save
                </Button>
              </View>
            </ScrollView>
          </Modal>
        </Portal>

        {/* 2. Interactive Voice Search Modal */}
        <VoiceSearchModal
          visible={voiceSearchActive}
          onDismiss={() => setVoiceSearchActive(false)}
          onSearch={(query) => handleExecuteVoiceSearch(query)}
          recentSearches={recentSearches}
          onClearRecentSearches={clearRecentSearches}
          appLanguage={language}
          initialLanguage={isTel ? 'Telugu' : 'English'}
          titleTelugu="పాటల వాయిస్ శోధన"
          titleEnglish="Songs Voice Search"
        />
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  liveWidgetCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#37474f',
    elevation: 4,
    overflow: 'hidden',
  },
  liveWidgetCardActive: {
    backgroundColor: '#6366f1',
  },
  liveWidgetContent: {
    padding: 16,
  },
  liveWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glowingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  liveWidgetTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  widgetLyricsBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: 10,
  },
  widgetLyricsBoxBlack: {
    backgroundColor: '#000000',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetLyricsBoxBlank: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackoutText: {
    color: '#ff1744',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  blankText: {
    color: '#ffeb3b',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  widgetSongTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 6,
  },
  widgetLyricLine: {
    fontSize: 15,
    color: '#ffffff',
    marginVertical: 2,
    fontWeight: '500',
  },
  widgetLyricLineHighlight: {
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: 16.5,
  },
  widgetStandbyBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  standbyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  standbySubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textAlign: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchbar: {
    flex: 1,
    backgroundColor: '#ffffff',
    elevation: 2,
    borderRadius: 10,
    height: 48,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    margin: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 1,
  },
  activeChip: {
    backgroundColor: '#6366f1',
  },
  chipText: {
    fontSize: 13,
    color: '#666666',
  },
  activeChipText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 1,
  },
  activeCategoryChip: {
    backgroundColor: '#e91e63',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#666666',
  },
  activeCategoryChipText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1.5,
  },
  liveSongCard: {
    backgroundColor: '#e8eaf6',
    borderColor: '#6366f1',
    borderWidth: 1.5,
  },
  songIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveSongIconBox: {
    backgroundColor: '#6366f1',
  },
  songDetails: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  liveTagBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  songTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  songLangTag: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  songDot: {
    fontSize: 12,
    color: '#bdbdbd',
  },
  songCatTag: {
    fontSize: 12,
    color: '#757575',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 12,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 14,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#757575',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#1a1a1a',
    marginTop: 4,
  },
  rowSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  selectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f3f6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectorChipActive: {
    backgroundColor: '#ffebee',
    borderColor: '#c62828',
  },
  selectorChipText: {
    fontSize: 12,
    color: '#666',
  },
  selectorChipTextActive: {
    color: '#c62828',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
  }
});
