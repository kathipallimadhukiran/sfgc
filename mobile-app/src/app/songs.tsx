import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, FlatList, ScrollView, Platform, TouchableOpacity, TextInput, Alert, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { Searchbar, Card, Title, Text, Chip, List, Banner, IconButton, Divider, Portal, Modal, Button, FAB, HelperText } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { songsService, SongItem } from '@/services/songsService';
import { VoiceSearchModal } from '@/components/VoiceSearchModal';

const CATEGORIES = [
  'Worship', 'Praise', 'Prayer', 'Christmas', 'Easter', 'Youth',
  'Special Songs', 'Telugu', 'English', 'Good Friday', 'Offering',
  'Healing Prayer', 'Fasting Prayer', 'Revival', 'Communion', 'Baptism'
];

interface SongListItemProps {
  item: SongItem;
  isFav: boolean;
  isLive: boolean;
  isTel: boolean;
  canManageSongs: boolean;
  theme: any;
  translatedCategory: string;
  onPress: () => void;
  onToggleFav: () => void;
  onAddToSetlist: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SongListItem = React.memo(({
  item,
  isFav,
  isLive,
  isTel,
  canManageSongs,
  theme,
  translatedCategory,
  onPress,
  onToggleFav,
  onAddToSetlist,
  onEdit,
  onDelete,
}: SongListItemProps) => (
  <View style={[styles.songCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, isLive && styles.liveSongCard]}>
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 6 }}
    >
      <View style={[styles.songIconBox, isLive && styles.liveSongIconBox]}>
        <MaterialCommunityIcons 
          name={isLive ? "radio-tower" : "music-clef-treble"} 
          size={22} 
          color={isLive ? "#ffffff" : theme.primary} 
        />
      </View>
      <View style={styles.songDetails}>
        <View style={styles.titleRow}>
          <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
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
          <Text style={[styles.songCatTag, { color: theme.textSecondary }]} numberOfLines={1}>
            {translatedCategory}
          </Text>
        </View>
      </View>
    </TouchableOpacity>

    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
      <IconButton
        icon={isFav ? 'heart' : 'heart-outline'}
        iconColor={isFav ? '#e91e63' : theme.textSecondary}
        size={19}
        onPress={onToggleFav}
        style={{ margin: 0, width: 30, height: 30 }}
      />
      {canManageSongs && (
        <>
          <IconButton
            icon="playlist-plus"
            iconColor={theme.primary}
            size={18}
            onPress={onAddToSetlist}
            style={{ margin: 0, width: 30, height: 30 }}
          />
          <IconButton
            icon="pencil"
            iconColor={theme.primary}
            size={17}
            onPress={onEdit}
            style={{ margin: 0, width: 30, height: 30 }}
          />
          <IconButton
            icon="delete"
            iconColor="#dc2626"
            size={17}
            onPress={onDelete}
            style={{ margin: 0, width: 30, height: 30 }}
          />
        </>
      )}
    </View>
  </View>
));

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

  const getTranslatedCategory = (cat?: string) => {
    if (!cat) return isTel ? 'ఆరాధన గీతాలు' : 'Worship';
    if (!isTel) return cat;
    const cleanCat = cat.trim();
    switch (cleanCat) {
      case 'Worship':
      case 'Worship Songs': return 'ఆరాధన గీతాలు';
      case 'Praise':
      case 'Praise Songs': return 'స్తుతి గీతాలు';
      case 'Prayer':
      case 'Prayer Songs': return 'ప్రార్థన పాటలు';
      case 'Christmas':
      case 'Christmas Songs': return 'క్రిస్మస్ పాటలు';
      case 'Easter':
      case 'Easter Songs': return 'ఈస్టర్ పాటలు';
      case 'Youth':
      case 'Youth Songs': return 'యూత్ సాంగ్స్';
      case 'Special Songs':
      case 'Special Event Songs': return 'ప్రత్యేక కూడిక పాటలు';
      case 'Good Friday':
      case 'Good Friday Songs': return 'గుడ్ ఫ్రైడే పాటలు';
      case 'Offering':
      case 'Offering Songs': return 'కానుకల పాటలు';
      case 'Healing Prayer':
      case 'Healing Prayer Songs': return 'స్వస్థత ప్రార్థన పాటలు';
      case 'Fasting Prayer':
      case 'Fasting Prayer Songs': return 'ఉపవాస ప్రార్థన పాటలు';
      case 'Revival':
      case 'Revival Songs': return 'ఉజ్జీవ కూడిక పాటలు';
      case 'Communion':
      case 'Communion Songs': return 'ప్రభు రాత్రి భోజన పాటలు';
      case 'Baptism':
      case 'Baptism Songs': return 'బాప్తిస్మపు పాటలు';
      case 'Telugu': return 'తెలుగు';
      case 'English': return 'ఇంగ్లీష్';
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

  // Alphabetical Index, Favorites & Category filter state
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [letterModalVisible, setLetterModalVisible] = useState(false);

  const TELUGU_LETTERS = ['అ','ఆ','ఇ','ఈ','ఉ','ఊ','ఎ','ఏ','ఐ','ఒ','ఓ','ఔ','క','ఖ','గ','ఘ','చ','ఛ','జ','త','థ','ద','ధ','న','ప','ఫ','బ','భ','మ','య','ర','ల','వ','శ','ష','స','హ'];
  const ALPHABET_INDEX = TELUGU_LETTERS;

  const filteredSongs = songs.filter(song => {
    const songKey = (song._id || song.id || '').toString();
    const songCat = song.category || 'Worship';

    const matchesSearch = !searchQuery || 
                          song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (song.lyrics && song.lyrics.some((l: any) => l.text?.toLowerCase().includes(searchQuery.toLowerCase()))) ||
                          (song.tags && song.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesLang = !selectedLanguage || song.language === selectedLanguage;
    const matchesFav = !showFavoritesOnly || favorites.some((f: any) => (f._id || f.id || f).toString() === songKey);
    const matchesLetter = !selectedLetter || (song.title || '').trim().charAt(0).toUpperCase() === selectedLetter.toUpperCase();

    let matchesCategory = true;
    if (selectedCategory) {
      if (selectedCategory === 'Telugu') {
        matchesCategory = song.language === 'Telugu' || songCat === 'Telugu';
      } else if (selectedCategory === 'English') {
        matchesCategory = song.language === 'English' || songCat === 'English';
      } else {
        const catBase = selectedCategory.toLowerCase().replace(/\s+songs$/i, '');
        const songCatBase = songCat.toLowerCase().replace(/\s+songs$/i, '');
        matchesCategory = songCatBase.includes(catBase) || catBase.includes(songCatBase);
      }
    }

    return matchesSearch && matchesLang && matchesFav && matchesLetter && matchesCategory;
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
    router.push({ pathname: '/song-editor', params: { returnTo: '/songs' } });
  };

  const handleOpenEditModal = (song: any) => {
    const songId = song._id || song.id;
    router.push({ pathname: '/song-editor', params: { editId: songId, returnTo: '/songs' } });
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

  const keyExtractor = useCallback((item: SongItem, index: number) => item._id || item.id || `song_${index}`, []);

  const renderSongItem = useCallback(({ item }: { item: SongItem }) => {
    const songKey = item._id || item.id || '';
    const isFav = favorites.includes(songKey);
    const isLive = Boolean(liveSession && (liveSession.song?._id === songKey || liveSession.song?.id === songKey));

    return (
      <SongListItem
        item={item}
        isFav={isFav}
        isLive={isLive}
        isTel={isTel}
        canManageSongs={Boolean(canManageSongs)}
        theme={theme}
        translatedCategory={getTranslatedCategory(item.category)}
        onPress={() => router.push({ pathname: (isLive ? '/live-lyrics' : `/song/${songKey}`) as any, params: { returnTo: '/songs' } })}
        onToggleFav={() => toggleFavorite(songKey)}
        onAddToSetlist={() => {
          addToSetlist(item);
          setSetlistSnack(isTel ? `"${item.title}" జాబితాకు జోడించబడింది` : `"${item.title}" added to setlist`);
        }}
        onEdit={() => handleOpenEditModal(item)}
        onDelete={() => handleDeleteSong(songKey, item.title)}
      />
    );
  }, [favorites, liveSession, isTel, canManageSongs, theme, router, toggleFavorite, addToSetlist, getTranslatedCategory, handleOpenEditModal, handleDeleteSong]);

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

        {/* 1. SEARCH */}
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

        {/* CATEGORY CAROUSEL — Fixed Exact Height */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ height: 44, maxHeight: 44, marginVertical: 4 }}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 8 }}
        >
          {/* All Songs Pill */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setSelectedCategory(null);
              setShowFavoritesOnly(false);
              setSelectedLanguage(null);
              setSelectedLetter(null);
              setSearchQuery('');
            }}
            style={[
              styles.categoryPill,
              {
                backgroundColor: (selectedCategory === null && !showFavoritesOnly && selectedLanguage === null && selectedLetter === null && !searchQuery) ? theme.primary : theme.backgroundElement,
                borderColor: (selectedCategory === null && !showFavoritesOnly && selectedLanguage === null && selectedLetter === null && !searchQuery) ? theme.primary : theme.cardBorder,
              }
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.categoryPillText,
                { color: (selectedCategory === null && !showFavoritesOnly && selectedLanguage === null && selectedLetter === null && !searchQuery) ? '#ffffff' : theme.text },
                (selectedCategory === null && !showFavoritesOnly && selectedLanguage === null && selectedLetter === null && !searchQuery) && { fontWeight: 'bold' }
              ]}
            >
              {isTel ? 'అన్ని పాటలు' : 'All Songs'}
            </Text>
          </TouchableOpacity>

          {/* Favorites Pill */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              if (!showFavoritesOnly) {
                setSelectedCategory(null);
              }
            }}
            style={[
              styles.categoryPill,
              {
                backgroundColor: showFavoritesOnly ? '#e91e63' : theme.backgroundElement,
                borderColor: showFavoritesOnly ? '#e91e63' : theme.cardBorder,
              }
            ]}
          >
            <MaterialCommunityIcons 
              name={showFavoritesOnly ? "heart" : "heart-outline"} 
              size={15} 
              color={showFavoritesOnly ? '#ffffff' : '#e91e63'} 
            />
            <Text
              numberOfLines={1}
              style={[
                styles.categoryPillText,
                { color: showFavoritesOnly ? '#ffffff' : theme.text },
                showFavoritesOnly && { fontWeight: 'bold' }
              ]}
            >
              {isTel ? 'ఇష్టమైనవి' : 'Favorites'}
            </Text>
          </TouchableOpacity>

          {/* Category Pills */}
          {CATEGORIES.filter(cat => cat !== 'Telugu' && cat !== 'English').map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                onPress={() => {
                  if (selectedCategory === cat) {
                    setSelectedCategory(null);
                  } else {
                    setSelectedCategory(cat);
                    setShowFavoritesOnly(false);
                  }
                }}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                    borderColor: isSelected ? theme.primary : theme.cardBorder,
                  }
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryPillText,
                    { color: isSelected ? '#ffffff' : theme.text },
                    isSelected && { fontWeight: 'bold' }
                  ]}
                >
                  {getTranslatedCategory(cat)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. ALPHABETICAL FILTER */}

        {/* Button to open Telugu Letter Selection Popup Modal */}
        <View style={{ marginVertical: 8, paddingHorizontal: 12 }}>
          <TouchableOpacity
            onPress={() => setLetterModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selectedLetter ? theme.primary : theme.cardBorder,
              backgroundColor: selectedLetter ? theme.primary + '15' : theme.backgroundElement,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="sort-alphabetical-variant" size={22} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                {selectedLetter 
                  ? (isTel ? `ఎంచుకున్న అక్షరం: "${selectedLetter}" (మార్చు)` : `Selected Letter: "${selectedLetter}" (Change)`)
                  : (isTel ? '🔤 అక్షరంతో పాటను ఎంచుకోండి (అ - హ)' : '🔤 Filter Songs by Starting Letter (అ - హ)')}
              </Text>
            </View>
            {selectedLetter ? (
              <TouchableOpacity onPress={() => setSelectedLetter(null)} style={{ padding: 2 }}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Songs FlatList */}
        <FlatList
          data={filteredSongs}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          renderItem={renderSongItem}
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

        {/* Telugu Alphabet Letter Selector Modal */}
        <Portal>
          <Modal
          visible={letterModalVisible}
          onDismiss={() => setLetterModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: theme.backgroundElement,
            margin: 20,
            borderRadius: 16,
            padding: 18,
            maxHeight: '80%',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary }}>
              {isTel ? '🔤 అక్షరంతో పాటను ఎంచుకోండి' : '🔤 Select Starting Letter'}
            </Text>
            <TouchableOpacity onPress={() => setLetterModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 14 }}>
            {isTel ? 'పాట శీర్షిక మొదలయ్యే తెలుగు అక్షరాన్ని ఎంచుకోండి:' : 'Select Telugu letter to filter songs:'}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingBottom: 16 }}>
              <TouchableOpacity
                onPress={() => { setSelectedLetter(null); setLetterModalVisible(false); }}
                style={[{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.background }, selectedLetter === null && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              >
                <Text style={[{ fontSize: 13, fontWeight: 'bold', color: theme.text }, selectedLetter === null && { color: '#ffffff' }]}>
                  {isTel ? 'అన్ని పాటలు (All)' : 'All Songs'}
                </Text>
              </TouchableOpacity>
              {ALPHABET_INDEX.map((letter) => (
                <TouchableOpacity
                  key={letter}
                  onPress={() => { setSelectedLetter(letter); setLetterModalVisible(false); }}
                  style={[{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.background }, selectedLetter === letter && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                >
                  <Text style={[{ fontSize: 15, fontWeight: 'bold', color: theme.text }, selectedLetter === letter && { color: '#ffffff' }]}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
  categoryPill: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  langToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
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
    marginLeft: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  liveTagBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  liveTagText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
