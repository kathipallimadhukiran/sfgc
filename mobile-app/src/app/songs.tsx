import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, ScrollView, Platform, TouchableOpacity, TextInput, Alert, RefreshControl, KeyboardAvoidingView } from 'react-native';
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
  const { songs, favorites, toggleFavorite, liveSession, refreshData, user, token, language,
          addToSetlist, removeFromSetlist, reorderSetlist, clearSetlist, setlist } = useApp();
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

  // Alphabetical Index & Favorites filter state
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const TELUGU_LETTERS = ['అ','ఆ','ఇ','ఈ','ఉ','ఊ','ఎ','ఏ','ఐ','ఒ','ఓ','ఔ','క','ఖ','గ','ఘ','చ','ఛ','జ','త','థ','ద','ధ','న','ప','ఫ','బ','భ','మ','య','ర','ల','వ','శ','ష','స','హ'];
  const ALPHABET_INDEX = TELUGU_LETTERS;

  const filteredSongs = songs.filter(song => {
    const songKey = song._id || song.id || '';
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (song.tags && song.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesLang = !selectedLanguage || song.language === selectedLanguage;
    const matchesCat = !selectedCategory || song.category === selectedCategory;
    const matchesFav = !showFavoritesOnly || favorites.includes(songKey);
    const matchesLetter = !selectedLetter || (song.title || '').trim().charAt(0).toUpperCase() === selectedLetter.toUpperCase();

    return matchesSearch && matchesLang && matchesCat && matchesFav && matchesLetter;
  });

  const activeSlide = liveSession?.song?.lyrics?.[liveSession?.currentSlideIndex];
  const lyricLines = activeSlide?.text?.split('\n') || [];
  const highlightedLineIndex = liveSession?.highlightedLineIndex;

  // Authorization check for adding, editing and deleting lyrics
  const canManageSongs = user && ['Admin', 'Super Admin', 'Worship Leader', 'Choir Leader', 'Media Team'].includes(user.role);
  const canOperate = canManageSongs;

  // Setlist panel state
  const [showSetlistPanel, setShowSetlistPanel] = useState(false);
  const [setlistSnack, setSetlistSnack] = useState('');

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
      // Split by double-newline, filter empty blocks, detect slide types
      const rawBlocks = newLyrics.split(/\n\n+/).map((b: string) => b.trim()).filter((b: string) => b.length > 0);
      let verseCount = 0;
      const slides = rawBlocks.map((block: string) => {
        const lc = block.toLowerCase();
        let type: string;
        let text = block;
        if (lc.startsWith('chorus:')) {
          type = 'Chorus'; text = block.replace(/^chorus:?\s*/i, '').trim();
        } else if (lc.startsWith('bridge:')) {
          type = 'Bridge'; text = block.replace(/^bridge:?\s*/i, '').trim();
        } else if (lc.startsWith('pre-chorus:') || lc.startsWith('prechorus:')) {
          type = 'Pre-Chorus'; text = block.replace(/^pre-?chorus:?\s*/i, '').trim();
        } else if (lc.startsWith('outro:')) {
          type = 'Outro'; text = block.replace(/^outro:?\s*/i, '').trim();
        } else {
          verseCount++; type = `Verse ${verseCount}`;
        }
        return { type, text };
      }).filter((s: any) => s.text.length > 0);

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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Setlist Panel for operators */}
        {canOperate && showSetlistPanel && (
          <View style={styles.setlistPanel}>
            <View style={styles.setlistPanelHeader}>
              <Text style={styles.setlistPanelTitle}>
                🎵 {isTel ? 'సేవా పాటల జాబితా' : 'Service Setlist'}
                {setlist.length > 0 && (
                  <Text style={{ color: '#6366f1' }}> ({setlist.length})</Text>
                )}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {setlist.length > 0 && (
                  <TouchableOpacity
                    style={styles.setlistClearBtn}
                    onPress={() => {
                      clearSetlist();
                    }}
                  >
                    <MaterialCommunityIcons name="delete-sweep" size={16} color="#e53e3e" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowSetlistPanel(false)} style={styles.setlistCloseBtn}>
                  <MaterialCommunityIcons name="chevron-up" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            {setlist.length === 0 ? (
              <Text style={styles.setlistEmpty}>
                {isTel ? 'జాబితా ఖాళీగా ఉంది. పాట కార్డుపై + నొక్కి జోడించండి.' : 'Setlist is empty. Tap + on a song card to add it.'}
              </Text>
            ) : (
              <ScrollView horizontal={false} style={{ maxHeight: 180 }}>
                {setlist.map((item, index) => {
                  const songKey = item._id || item.id || '';
                  return (
                    <View key={songKey + index} style={styles.setlistRow}>
                      <View style={styles.setlistIndexBadge}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{index + 1}</Text>
                      </View>
                      <Text style={styles.setlistRowTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={[styles.setlistLangBadge, item.language === 'Telugu' && { backgroundColor: '#7c3aed' }]}>
                        <Text style={styles.setlistLangBadgeText}>{item.language === 'Telugu' ? 'TEL' : 'ENG'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {index > 0 && (
                          <TouchableOpacity onPress={() => reorderSetlist(index, index - 1)} style={styles.setlistReorderBtn}>
                            <MaterialCommunityIcons name="chevron-up" size={14} color="#6366f1" />
                          </TouchableOpacity>
                        )}
                        {index < setlist.length - 1 && (
                          <TouchableOpacity onPress={() => reorderSetlist(index, index + 1)} style={styles.setlistReorderBtn}>
                            <MaterialCommunityIcons name="chevron-down" size={14} color="#6366f1" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => removeFromSetlist(songKey)} style={styles.setlistRemoveBtn}>
                          <MaterialCommunityIcons name="close" size={14} color="#e53e3e" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            {setlist.length > 0 && (
              <TouchableOpacity
                style={styles.openOperatorBtn}
                onPress={() => router.push('/live-lyrics')}
              >
                <MaterialCommunityIcons name="broadcast" size={16} color="#fff" />
                <Text style={styles.openOperatorBtnText}>
                  {isTel ? 'ఆపరేటర్ కన్సోల్ తెరవండి' : 'Open Operator Console'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Live Worship Banner / Preview card - Render ONLY when liveSession is active */}
        {Boolean(liveSession) && (
          <Card 
            style={[styles.liveWidgetCard, styles.liveWidgetCardActive]}
            onPress={() => router.push('/live-lyrics')}
          >
            <Card.Content style={styles.liveWidgetContent}>
              <View style={styles.liveWidgetHeader}>
                <View style={styles.liveHeaderLeft}>
                  <View style={[styles.glowingDot, { backgroundColor: '#4caf50' }]} />
                  <Text style={styles.liveWidgetTitle}>
                    {isTel ? 'లైవ్ ఆరాధన ప్రదర్శన (యాక్టివ్)' : 'LIVE WORSHIP DISPLAY (ACTIVE)'}
                  </Text>
                </View>
                <IconButton 
                  icon="fullscreen" 
                  iconColor="#ffffff" 
                  size={20} 
                  style={{ margin: 0, padding: 0 }} 
                />
              </View>

              {liveSession.blackScreen ? (
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
              )}
            </Card.Content>
          </Card>
        )}

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <Searchbar
              placeholder={isTel ? 'పాటలు లేదా కీవర్డ్స్ శోధించండి...' : 'Search songs or keywords...'}
              onChangeText={setSearchQuery}
              value={searchQuery}
              icon="magnify"
              clearIcon="close"
              style={[styles.searchbar, { backgroundColor: theme.backgroundElement }]}
              inputStyle={{ fontSize: 14, color: theme.text }}
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

        {/* Language & Favorites Quick Filters */}
        <View style={styles.filterRow}>
          <Chip
            selected={selectedLanguage === null && !showFavoritesOnly}
            onPress={() => { setSelectedLanguage(null); setShowFavoritesOnly(false); }}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }, (selectedLanguage === null && !showFavoritesOnly) && styles.activeChip]}
            textStyle={[styles.chipText, { color: theme.text }, (selectedLanguage === null && !showFavoritesOnly) && styles.activeChipText]}
            showSelectedOverlay={false}
          >
            {isTel ? 'అన్ని పాటలు' : 'All Songs'}
          </Chip>
          <Chip
            selected={showFavoritesOnly}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }, showFavoritesOnly && { backgroundColor: '#e91e63' }]}
            textStyle={[styles.chipText, { color: theme.text }, showFavoritesOnly && { color: '#ffffff', fontWeight: 'bold' }]}
            showSelectedOverlay={false}
          >
            {isTel ? '❤️ ఇష్టమైనవి' : '❤️ Favorites'}
          </Chip>
          <Chip
            selected={selectedLanguage === 'Telugu'}
            onPress={() => { setSelectedLanguage(selectedLanguage === 'Telugu' ? null : 'Telugu'); }}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }, selectedLanguage === 'Telugu' && styles.activeChip]}
            textStyle={[styles.chipText, { color: theme.text }, selectedLanguage === 'Telugu' && styles.activeChipText]}
            showSelectedOverlay={false}
          >
            {isTel ? 'తెలుగు' : 'Telugu'}
          </Chip>
          <Chip
            selected={selectedLanguage === 'English'}
            onPress={() => { setSelectedLanguage(selectedLanguage === 'English' ? null : 'English'); }}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }, selectedLanguage === 'English' && styles.activeChip]}
            textStyle={[styles.chipText, { color: theme.text }, selectedLanguage === 'English' && styles.activeChipText]}
            showSelectedOverlay={false}
          >
            {isTel ? 'ఇంగ్లీష్' : 'English'}
          </Chip>
        </View>

        {/* Alphabetical First-Letter Index Bar (Telugu / English A-Z) */}
        <View style={{ marginVertical: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
            <TouchableOpacity
              onPress={() => setSelectedLetter(null)}
              style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }, selectedLetter === null && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Text style={[{ fontSize: 12, fontWeight: 'bold', color: theme.text }, selectedLetter === null && { color: '#ffffff' }]}>
                {isTel ? 'అన్నీ' : 'ALL'}
              </Text>
            </TouchableOpacity>
            {ALPHABET_INDEX.map((letter) => (
              <TouchableOpacity
                key={letter}
                onPress={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }, selectedLetter === letter && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              >
                <Text style={[{ fontSize: 12, fontWeight: 'bold', color: theme.text }, selectedLetter === letter && { color: '#ffffff' }]}>
                  {letter}
                </Text>
              </TouchableOpacity>
            ))}
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
              <View style={[styles.songCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, isLive && styles.liveSongCard]}>
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
                      <Text style={[styles.songTitle, { color: theme.text }]}>{item.title}</Text>
                      {isLive && (
                        <View style={styles.liveTagBadge}>
                          <Text style={styles.liveTagText}>LIVE</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.songTagsRow}>
                      <Text style={[styles.songLangTag, { color: theme.textSecondary }]}>
                        {item.language === 'Telugu' ? (isTel ? 'తెలుగు' : 'Telugu') : (isTel ? 'ఇంగ్లీష్' : 'English')}
                      </Text>
                      <Text style={[styles.songDot, { color: theme.textSecondary }]}>•</Text>
                      <Text style={[styles.songCatTag, { color: theme.textSecondary }]}>{getTranslatedCategory(item.category)}</Text>
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
                        icon="playlist-plus"
                        iconColor={isLive ? '#ffd54f' : '#6366f1'}
                        size={18}
                        onPress={() => {
                          addToSetlist(item);
                          setSetlistSnack(isTel ? `"${item.title}" జాబితాకు జోడించబడింది` : `"${item.title}" added to setlist`);
                        }}
                        style={{ margin: 0 }}
                      />
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
          <>
            {/* Go Live Operator FAB */}
            <TouchableOpacity
              style={styles.goLiveOperatorFab}
              onPress={() => setShowSetlistPanel(!showSetlistPanel)}
            >
              <MaterialCommunityIcons name="playlist-music" size={20} color="#fff" />
              {setlist.length > 0 && (
                <View style={styles.setlistBadge}>
                  <Text style={styles.setlistBadgeText}>{setlist.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <FAB
              icon="plus"
              style={[styles.fab, { backgroundColor: theme.primary }]}
              color="#ffffff"
              onPress={handleOpenAddModal}
            />
          </>
        )}

        {/* Add/Edit Song Modal Overlay — Full Screen */}
        <Portal>
          <Modal
            visible={addModalVisible}
            onDismiss={() => setAddModalVisible(false)}
            contentContainerStyle={[styles.modalFullScreen, { backgroundColor: theme.backgroundElement }]}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
                <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {editingId ? (isTel ? 'పాట సవరించు' : 'Edit Song') : (isTel ? 'కొత్త పాట జోడించు' : 'Add New Song')}
                </Text>
                <Button
                  mode="contained"
                  onPress={handleAddSongSubmit}
                  loading={submitting}
                  disabled={submitting}
                  buttonColor={theme.primary}
                  style={{ borderRadius: 8 }}
                  labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                >
                  {submitting ? (isTel ? 'సేవ్ చేస్తోంది...' : 'Saving...') : (isTel ? 'సేవ్ చేయి' : 'Save')}
                </Button>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={[styles.modalBody, { backgroundColor: theme.backgroundElement }]} keyboardShouldPersistTaps="handled">

              {/* Song Title */}
              <Text style={styles.inputLabel}>{isTel ? 'పాట శీర్షిక *' : 'Song Title *'}</Text>
              <TextInput
                placeholder={isTel ? 'ఉదా: హోసన్నా' : 'e.g., Hosanna in the Highest'}
                placeholderTextColor="#aaa"
                value={newTitle}
                onChangeText={setNewTitle}
                style={styles.textInput}
              />

              {/* Language */}
              <Text style={styles.inputLabel}>{isTel ? 'భాష' : 'Language'}</Text>
              <View style={styles.rowSelector}>
                {['Telugu', 'English'].map(lang => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.selectorChip, newLang === lang && styles.selectorChipActive]}
                    onPress={() => setNewLang(lang)}
                  >
                    <Text style={[styles.selectorChipText, newLang === lang && styles.selectorChipTextActive]}>
                      {lang === 'Telugu' ? (isTel ? 'తెలుగు' : 'Telugu') : (isTel ? 'ఇంగ్లీష్' : 'English')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Text style={styles.inputLabel}>{isTel ? 'వర్గం' : 'Category'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.selectorChip, newCat === cat && styles.selectorChipActive]}
                      onPress={() => setNewCat(cat)}
                    >
                      <Text style={[styles.selectorChipText, newCat === cat && styles.selectorChipTextActive]}>
                        {getTranslatedCategory(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* YouTube Link */}
              <Text style={styles.inputLabel}>{isTel ? 'యూట్యూబ్ లింక్ (ఐచ్ఛికం)' : 'YouTube Link (Optional)'}</Text>
              <TextInput
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#aaa"
                value={newYoutube}
                onChangeText={setNewYoutube}
                style={styles.textInput}
                autoCapitalize="none"
                keyboardType="url"
              />

              {/* Chords */}
              <Text style={styles.inputLabel}>{isTel ? 'గిటార్ కోర్డులు (ఐచ్ఛికం)' : 'Guitar Chords (Optional)'}</Text>
              <TextInput
                placeholder="G   C   D   Em  ..."
                placeholderTextColor="#aaa"
                value={newChords}
                onChangeText={setNewChords}
                multiline
                style={[styles.textInput, styles.chordsInput]}
              />

              {/* Lyrics — large area */}
              <View style={styles.lyricsLabelRow}>
                <Text style={styles.inputLabel}>{isTel ? 'సాహిత్యం *' : 'Lyrics *'}</Text>
                {newLyrics.length > 0 && (() => {
                  const count = newLyrics.split(/\n\n+/).map((b: string) => b.trim()).filter((b: string) => b.length > 0).length;
                  return (
                    <View style={styles.slideCountBadge}>
                      <MaterialCommunityIcons name="layers" size={12} color={theme.primary} />
                      <Text style={[styles.slideCountText, { color: theme.primary }]}>
                        {count} {isTel ? 'స్లయిడ్లు' : count === 1 ? 'slide' : 'slides'}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* Instruction box */}
              <View style={styles.lyricsHintBox}>
                <MaterialCommunityIcons name="information-outline" size={14} color="#6366f1" style={{ marginTop: 1 }} />
                <Text style={styles.lyricsHintText}>
                  {isTel
                    ? 'ప్రతి వర్సు/కోరస్ మధ్య రెండుసార్లు Enter నొక్కండి — ఒక్కో విభాగం ఒక స్లయిడ్ అవుతుంది.\nPrefix ఉపయోగించండి: chorus: bridge: outro:'
                    : 'Press Enter twice between each verse/chorus — each block becomes one slide.\nOptional prefixes: chorus: bridge: outro: pre-chorus:'}
                </Text>
              </View>

              <TextInput
                placeholder={
                  isTel
                    ? 'Verse 1 మొదటి పంక్తి\nVerse 1 రెండవ పంక్తి\n\nchorus:\nకోరస్ మొదటి పంక్తి\nకోరస్ రెండవ పంక్తి\n\nVerse 2 మొదటి పంక్తి'
                    : 'Line 1 of verse 1\nLine 2 of verse 1\n\nchorus:\nChorus line 1\nChorus line 2\n\nLine 1 of verse 2'
                }
                placeholderTextColor="#bbb"
                value={newLyrics}
                onChangeText={setNewLyrics}
                multiline
                style={styles.lyricsTextarea}
                textAlignVertical="top"
                scrollEnabled={false}
              />

              {/* Slide preview when lyrics present */}
              {newLyrics.trim().length > 0 && (() => {
                const rawBlocks = newLyrics.split(/\n\n+/).map((b: string) => b.trim()).filter((b: string) => b.length > 0);
                return rawBlocks.length > 0 ? (
                  <View style={styles.slidePreviewBox}>
                    <Text style={styles.slidePreviewTitle}>
                      {isTel ? '📋 స్లయిడ్ ప్రివ్యూ' : '📋 Slide Preview'}
                    </Text>
                    {rawBlocks.map((block: string, i: number) => {
                      const lc = block.toLowerCase();
                      let label = `Verse ${i + 1}`;
                      let displayText = block;
                      if (lc.startsWith('chorus:')) { label = 'Chorus'; displayText = block.replace(/^chorus:?\s*/i, ''); }
                      else if (lc.startsWith('bridge:')) { label = 'Bridge'; displayText = block.replace(/^bridge:?\s*/i, ''); }
                      else if (lc.startsWith('outro:')) { label = 'Outro'; displayText = block.replace(/^outro:?\s*/i, ''); }
                      return (
                        <View key={i} style={styles.slidePreviewItem}>
                          <View style={styles.slidePreviewHeader}>
                            <View style={styles.slidePreviewBadge}>
                              <Text style={styles.slidePreviewBadgeText}>{label.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.slidePreviewIndex}>#{i + 1}</Text>
                          </View>
                          <Text style={styles.slidePreviewText} numberOfLines={3}>{displayText.trim()}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null;
              })()}

              <View style={{ height: 32 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>


        {/* 2. Interactive Voice Search Modal */}
        <VoiceSearchModal
          visible={voiceSearchActive}
          onDismiss={() => setVoiceSearchActive(false)}
          onSearch={(query) => handleExecuteVoiceSearch(query)}
          onTranscriptChange={(query) => setSearchQuery(query)}
          recentSearches={recentSearches}
          onClearRecentSearches={clearRecentSearches}
          appLanguage={language}
          initialLanguage={isTel ? 'Telugu' : 'English'}
          titleTelugu="పాటల వాయిస్ శోధన"
          titleEnglish="Songs Voice Search"
        />

        {/* Setlist Snack */}
        {setlistSnack !== '' && (
          <View style={styles.snackContainer}>
            <Text style={styles.snackText}>{setlistSnack}</Text>
            <TouchableOpacity onPress={() => setSetlistSnack('')}>
              <MaterialCommunityIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
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
  modalFullScreen: {
    backgroundColor: '#ffffff',
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 44 : 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: '#fafafa',
    fontSize: 14,
    color: '#1a1a1a',
  },
  chordsInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    height: 80,
    textAlignVertical: 'top',
  },
  lyricsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 4,
  },
  slideCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slideCountText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  lyricsHintBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  lyricsHintText: {
    flex: 1,
    fontSize: 11,
    color: '#4338ca',
    lineHeight: 17,
  },
  lyricsTextarea: {
    borderWidth: 1.5,
    borderColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fafbff',
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 24,
    minHeight: 220,
  },
  slidePreviewBox: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  slidePreviewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slidePreviewItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  slidePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slidePreviewBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  slidePreviewBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  slidePreviewIndex: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  slidePreviewText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
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
  },


  // ── Setlist Panel ──
  setlistPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 4,
  },
  setlistPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  setlistPanelTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  setlistClearBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
  },
  setlistCloseBtn: {
    padding: 4,
  },
  setlistEmpty: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  setlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
    gap: 8,
  },
  setlistIndexBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setlistRowTitle: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  setlistLangBadge: {
    backgroundColor: '#1e5f74',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  setlistLangBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  setlistReorderBtn: {
    padding: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  setlistRemoveBtn: {
    padding: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(229,62,62,0.1)',
  },
  openOperatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    marginTop: 10,
  },
  openOperatorBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  goLiveOperatorFab: {
    position: 'absolute',
    right: 80,
    bottom: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  setlistBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffd54f',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  setlistBadgeText: {
    color: '#111',
    fontSize: 9,
    fontWeight: 'bold',
  },
  snackContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#1e1e3f',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 8,
  },
  snackText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
});
