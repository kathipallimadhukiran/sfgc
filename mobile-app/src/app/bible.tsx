import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, View, Platform, TouchableOpacity, Share, PanResponder, RefreshControl } from 'react-native';
import { Card, Button, Text, Divider, ActivityIndicator, Portal, Modal, IconButton, Switch } from 'react-native-paper';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/theme';
import { ALL_BIBLE_BOOKS, BibleBook } from '@/constants/bibleData';
import { bibleService } from '@/services/bibleService';
import { VoiceSearchModal } from '@/components/VoiceSearchModal';
import { biblePlanService, UserProgressData } from '@/services/biblePlanService';
import { DailyPortion } from '@/constants/defaultBiblePlans';
import { BibleQuizModal } from '@/components/BibleQuizModal';
import { LeaderboardCard } from '@/components/LeaderboardCard';

// Inspirational bilingual Bible quotations/verses
const BIBLE_QUOTES = [
  {
    ref: "Psalm 119:105 / కీర్తనలు 119:105",
    english: "Thy word is a lamp unto my feet, and a light unto my path.",
    telugu: "నీ వాక్యము నా పాదములకు దీపమును నా త్రోవకు వెలుగునై యున్నది."
  },
  {
    ref: "Joshua 1:8 / యెహోషువ 1:8",
    english: "This book of the law shall not depart out of thy mouth; but thou shalt meditate therein day and night, that thou mayest observe to do according to all that is written therein: for then thou shalt make thy way prosperous, and then thou shalt have good success.",
    telugu: "ఈ ధర్మశాస్త్రగ్రంథమును నీవు నోటనుండి తప్పింపకూడదు; దానిలో వ్రాయబడిన వాటన్నిటి ప్రకారము చేయుటకు నీవు జాగ్రత్తపడునట్లు దివారాత్రము దాని ధ్యానింపవలెను, అప్పుడు నీ మార్గమును వర్ధిల్లజేసికొని చక్కగా ప్రవర్తించెదవు."
  },
  {
    ref: "Matthew 4:4 / మత్తయి 4:4",
    english: "Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God.",
    telugu: "మనుష్యుడు రొట్టెవలన మాత్రమేగాక దేవుని నోటనుండి వచ్చు ప్రతి మాటవలనను జీవించును."
  },
  {
    ref: "Psalm 1:2-3 / కీర్తనలు 1:2-3",
    english: "But his delight is in the law of the Lord; and in his law doth he meditate day and night. And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.",
    telugu: "యెహోవా ధర్మశాస్త్రమునందు ఆనందించుచు దివారాత్రము దాని ధ్యానించువాడు ధన్యుడు. అతడు నీటికాలువల యోరను నాటబడినదై ఆకు వాడక తన కాలమందు ఫలమిచ్చు చెట్టువలె నుండును."
  },
  {
    ref: "Colossians 3:16 / కొలొస్సయులకు 3:16",
    english: "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs, singing with grace in your hearts to the Lord.",
    telugu: "సంగీతములతోను కీర్తనలతోను ఆత్మసంబంధమైన పద్యములతోను ఒకనికి ఒకడు బోధించుచు బుద్ధిచెప్పుచు, కృపాసహితముగా మీ హృదయములలో దేవునిగూర్చి పాడుచు, క్రీస్తు వాక్యము మీలో సమృద్ధిగా నివసింపనీయుడి."
  }
];

export default function BibleScreen() {
  const { language, bibleLanguage, themeMode, setLanguage, t, user, selectedBiblePlan } = useApp();
  
  // Localized theme mode override for Bible screen only
  const [localThemeMode, setLocalThemeMode] = useState<'light' | 'dark' | null>(null);
  const currentThemeMode = localThemeMode ?? themeMode;
  const theme = Colors[currentThemeMode];

  // Get daily quote based on today's date index
  const todayIndex = new Date().getDate() % BIBLE_QUOTES.length;
  const todayQuote = BIBLE_QUOTES[todayIndex];
  const quoteText = bibleLanguage === 'Telugu' ? todayQuote.telugu : todayQuote.english;
  
  // Local Bible Version state defaults to selected Bible Language
  const [bibleVersion, setBibleVersion] = useState<'Telugu' | 'English'>(bibleLanguage || 'Telugu');

  useEffect(() => {
    if (bibleLanguage) {
      setBibleVersion(bibleLanguage);
    }
  }, [bibleLanguage]);
  
  // Bible Reader state
  const [selectedBook, setSelectedBook] = useState<BibleBook>(ALL_BIBLE_BOOKS[0]); // Default: John (యోహాను)
  const [selectedChapter, setSelectedChapter] = useState('1');
  const [selectedVerse, setSelectedVerse] = useState('All');

  const params = useLocalSearchParams<{ autoOpenBook?: string; autoOpenChapter?: string }>();

  useEffect(() => {
    if (params.autoOpenBook) {
      const foundBook = ALL_BIBLE_BOOKS.find(
        (b) => b.english.toLowerCase() === params.autoOpenBook?.toLowerCase() || b.telugu === params.autoOpenBook
      );
      if (foundBook) {
        setSelectedBook(foundBook);
        if (params.autoOpenChapter) {
          setSelectedChapter(String(params.autoOpenChapter));
        } else {
          setSelectedChapter('1');
        }
      }
    }
  }, [params.autoOpenBook, params.autoOpenChapter]);
  
  const [englishVerses, setEnglishVerses] = useState<any[]>([]);
  const [teluguVerses, setTeluguVerses] = useState<any[]>([]);
  const [loadingBible, setLoadingBible] = useState(false);
  const [errorBible, setErrorBible] = useState('');
  const [fontSize, setFontSize] = useState(16);

  // Multi-verse selection state for instant batch sharing
  const [selectedVersesMap, setSelectedVersesMap] = useState<Record<number, any>>({});

  // Dropdown modal open states
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [chapterModalVisible, setChapterModalVisible] = useState(false);
  const [verseModalVisible, setVerseModalVisible] = useState(false);

  // Entire Bible search states
  const [searchResultsModalVisible, setSearchResultsModalVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingBible, setSearchingBible] = useState(false);
  const [voiceSearchActive, setVoiceSearchActive] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Bible Reading Plan & Streak State
  const [todayPortion, setTodayPortion] = useState<DailyPortion | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgressData | null>(null);
  const [quizModalVisible, setQuizModalVisible] = useState(false);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardRefreshTrigger, setLeaderboardRefreshTrigger] = useState(0);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPlanAndStreak(),
        fetchBiblePassage(selectedBook.english, selectedChapter)
      ]);
      setLeaderboardRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.log('Error refreshing Bible screen:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPlanAndStreak();
      setLeaderboardRefreshTrigger(prev => prev + 1);
    }, [selectedBiblePlan, user])
  );

  const hasCompletedQuizToday = () => {
    if (!userProgress?.lastCompletedDate) return false;
    const lastDate = new Date(userProgress.lastCompletedDate);
    const today = new Date();
    return lastDate.getDate() === today.getDate() &&
           lastDate.getMonth() === today.getMonth() &&
           lastDate.getFullYear() === today.getFullYear();
  };

  const loadPlanAndStreak = async () => {
    try {
      const activePlan = selectedBiblePlan || '1-year-canonical';
      const userId = user?.id || 'guest_user';
      const prog = await biblePlanService.getUserProgress(userId, activePlan);
      setUserProgress(prog);
      const portion = await biblePlanService.getTodayPortion(activePlan, prog.currentDay);
      setTodayPortion(portion);
    } catch (e) {
      console.log('Error loading plan progress:', e);
    }
  };

  useEffect(() => {
    loadPlanAndStreak();
  }, [selectedBiblePlan, user]);

  // Load initial passage & saved recent searches
  useEffect(() => {
    setLocalThemeMode(null);
    fetchBiblePassage(selectedBook.english, selectedChapter);
    loadPlanAndStreak();

    // Load recent searches from storage
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('bible_recent_searches');
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (e) {
        console.log('Error loading recent searches:', e);
      }
    })();
  }, []);

  const saveRecentSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 10);
        AsyncStorage.setItem('bible_recent_searches', JSON.stringify(updated)).catch(console.log);
        return updated;
      });
    } catch (e) {
      console.log('Error saving recent search:', e);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('bible_recent_searches');
    } catch (e) {
      console.log('Error clearing recent searches:', e);
    }
  };

  const getChapterCount = (bookName: string) => {
    return bibleService.getChapterCount(bookName);
  };

  const fetchBiblePassage = async (bookEnglish: string, chapter: string) => {
    setLoadingBible(true);
    setErrorBible('');
    setSelectedVersesMap({});
    try {
      // Load completely offline from bundled Bible Service
      const passage = await bibleService.getPassage(bookEnglish, chapter);
      setEnglishVerses(passage.eng || []);
      setTeluguVerses(passage.tel || []);
    } catch (err) {
      console.log('Bible passage load error:', err);
      setErrorBible(language === 'Telugu' ? 'ఈ అధ్యాయం లోడ్ చేయడంలో సమస్య ఏర్పడింది.' : 'Error loading chapter verses.');
    } finally {
      setLoadingBible(false);
    }
  };

  // Ref tracking to prevent stale closures in gesture handlers
  const selectedBookRef = useRef(selectedBook);
  selectedBookRef.current = selectedBook;

  const selectedChapterRef = useRef(selectedChapter);
  selectedChapterRef.current = selectedChapter;

  const mainScrollRef = useRef<ScrollView>(null);

  // Navigate to Next Chapter
  const goToNextChapter = () => {
    const currentBook = selectedBookRef.current;
    const currentCh = parseInt(selectedChapterRef.current, 10);
    const totalCh = getChapterCount(currentBook.english);
    
    if (currentCh < totalCh) {
      const nextCh = (currentCh + 1).toString();
      setSelectedChapter(nextCh);
      selectedChapterRef.current = nextCh;
      setSelectedVerse('All');
      fetchBiblePassage(currentBook.english, nextCh);
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      const currentBookIdx = ALL_BIBLE_BOOKS.findIndex(b => b.english === currentBook.english);
      if (currentBookIdx < ALL_BIBLE_BOOKS.length - 1) {
        const nextBook = ALL_BIBLE_BOOKS[currentBookIdx + 1];
        setSelectedBook(nextBook);
        selectedBookRef.current = nextBook;
        setSelectedChapter('1');
        selectedChapterRef.current = '1';
        setSelectedVerse('All');
        fetchBiblePassage(nextBook.english, '1');
        mainScrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  };

  // Navigate to Previous Chapter
  const goToPrevChapter = () => {
    const currentBook = selectedBookRef.current;
    const currentCh = parseInt(selectedChapterRef.current, 10);
    
    if (currentCh > 1) {
      const prevCh = (currentCh - 1).toString();
      setSelectedChapter(prevCh);
      selectedChapterRef.current = prevCh;
      setSelectedVerse('All');
      fetchBiblePassage(currentBook.english, prevCh);
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      const currentBookIdx = ALL_BIBLE_BOOKS.findIndex(b => b.english === currentBook.english);
      if (currentBookIdx > 0) {
        const prevBook = ALL_BIBLE_BOOKS[currentBookIdx - 1];
        const prevBookTotalCh = getChapterCount(prevBook.english).toString();
        setSelectedBook(prevBook);
        selectedBookRef.current = prevBook;
        setSelectedChapter(prevBookTotalCh);
        selectedChapterRef.current = prevBookTotalCh;
        setSelectedVerse('All');
        fetchBiblePassage(prevBook.english, prevBookTotalCh);
        mainScrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  };

  const getPrevChapterInfo = () => {
    const currentBook = selectedBookRef.current;
    const currentCh = parseInt(selectedChapterRef.current, 10);
    if (currentCh > 1) {
      const bookName = bibleVersion === 'Telugu' ? currentBook.telugu : currentBook.english;
      return `${bookName} ${currentCh - 1}`;
    }
    const currentBookIdx = ALL_BIBLE_BOOKS.findIndex(b => b.english === currentBook.english);
    if (currentBookIdx > 0) {
      const prevBook = ALL_BIBLE_BOOKS[currentBookIdx - 1];
      const prevBookTotalCh = getChapterCount(prevBook.english);
      const bookName = bibleVersion === 'Telugu' ? prevBook.telugu : prevBook.english;
      return `${bookName} ${prevBookTotalCh}`;
    }
    return null;
  };

  const getNextChapterInfo = () => {
    const currentBook = selectedBookRef.current;
    const currentCh = parseInt(selectedChapterRef.current, 10);
    const totalCh = getChapterCount(currentBook.english);
    if (currentCh < totalCh) {
      const bookName = bibleVersion === 'Telugu' ? currentBook.telugu : currentBook.english;
      return `${bookName} ${currentCh + 1}`;
    }
    const currentBookIdx = ALL_BIBLE_BOOKS.findIndex(b => b.english === currentBook.english);
    if (currentBookIdx < ALL_BIBLE_BOOKS.length - 1) {
      const nextBook = ALL_BIBLE_BOOKS[currentBookIdx + 1];
      const bookName = bibleVersion === 'Telugu' ? nextBook.telugu : nextBook.english;
      return `${bookName} 1`;
    }
    return null;
  };

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastSwipeTime = useRef(0);

  const handleSwipeNavigation = (direction: 'next' | 'prev') => {
    const now = Date.now();
    if (now - lastSwipeTime.current < 450) return;
    lastSwipeTime.current = now;

    if (direction === 'next') {
      goToNextChapter();
    } else {
      goToPrevChapter();
    }
  };

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent?.pageX || 0;
    touchStartY.current = e.nativeEvent?.pageY || 0;
  };

  const handleTouchEnd = (e: any) => {
    const endX = e.nativeEvent?.pageX || 0;
    const endY = e.nativeEvent?.pageY || 0;
    const diffX = endX - touchStartX.current;
    const diffY = endY - touchStartY.current;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX < 0) {
        handleSwipeNavigation('next');
      } else {
        handleSwipeNavigation('prev');
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 25 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -30) {
          handleSwipeNavigation('next');
        } else if (gestureState.dx > 30) {
          handleSwipeNavigation('prev');
        }
      },
    })
  ).current;

  // Toggle multi-verse selection
  const toggleVerseSelection = (verseItem: any) => {
    const verseNum = Number(verseItem.verse);
    setSelectedVersesMap(prev => {
      const copy = { ...prev };
      if (copy[verseNum]) {
        delete copy[verseNum];
      } else {
        copy[verseNum] = verseItem;
      }
      return copy;
    });
  };

  // Select search result from entire Bible popup
  const handleSelectSearchResult = (result: any) => {
    setSelectedBook(result.book);
    setSelectedChapter(result.chapter.toString());
    setSelectedVerse(result.verse.toString());
    setSearchResultsModalVisible(false);
    setSelectedVersesMap({
      [Number(result.verse)]: {
        verse: result.verse,
        text: result.text
      }
    });
    fetchBiblePassage(result.book.english, result.chapter.toString());
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Perform search across the complete 66-book Bible (by voice or typing)
  const handleSearchEntireBible = async (term: string) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    saveRecentSearch(cleanTerm);
    setCurrentSearchTerm(cleanTerm);
    setVoiceSearchActive(false);
    setSearchingBible(true);
    setSearchResultsModalVisible(true);
    setSearchResults([]);
    
    try {
      const results = await bibleService.searchEntireBible(cleanTerm, bibleVersion);
      setSearchResults(results);
    } catch (e) {
      console.log('Global Bible search error:', e);
    } finally {
      setSearchingBible(false);
    }
  };

  // Dynamic Share Handler: Shares selected verses if any, otherwise shares entire chapter
  const handleMainSharePress = () => {
    const selectedList = Object.values(selectedVersesMap).sort((a: any, b: any) => Number(a.verse) - Number(b.verse));
    const bookTitle = bibleVersion === 'Telugu' ? selectedBook.telugu : selectedBook.english;

    if (selectedList.length > 0) {
      // 1. Share ONLY the selected verses
      const verseNumbersStr = selectedList.map((v: any) => v.verse).join(', ');
      const textContent = selectedList.map((v: any) => `[${v.verse}] ${v.text}`).join('\n\n');

      Share.share({
        message: `📖 *${bookTitle} ${selectedChapter}:${verseNumbersStr} (${bibleVersion})*\n\n${textContent}\n\nShared from ChurchConnect Bible Reader.`,
      });
    } else {
      // 2. No verse selected -> Share ENTIRE Chapter
      const textContent = displayVerses.map(v => `[${v.verse}] ${v.text}`).join('\n');
      Share.share({
        message: `📖 *${bookTitle} Chapter ${selectedChapter}${selectedVerse !== 'All' ? `:${selectedVerse}` : ''} (${bibleVersion})* 📖\n\n${textContent}\n\nShared from ChurchConnect Bible Reader.`,
      });
    }
  };

  const currentVerses = bibleVersion === 'Telugu' ? teluguVerses : englishVerses;

  const displayVerses = selectedVerse === 'All' 
    ? currentVerses 
    : currentVerses.filter(v => v.verse.toString() === selectedVerse);

  const chaptersCount = getChapterCount(selectedBook.english);
  const chaptersArray = Array.from({ length: chaptersCount }, (_, i) => (i + 1).toString());
  const versesArray = ['All', ...currentVerses.map(v => v.verse.toString())];

  const prevInfo = getPrevChapterInfo();
  const nextInfo = getNextChapterInfo();

  const selectedCount = Object.keys(selectedVersesMap).length;

  return (
    <Portal.Host>
      <ScrollView 
        ref={mainScrollRef}
        style={[styles.container, { backgroundColor: theme.background }]} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      >
        {/* SECTION 2: Scripture Reader (బైబిల్ గ్రంథం) with Integrated Compact Header */}
        <View 
          style={[styles.lookupCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          {...panResponder.panHandlers}
        >
          {/* Compact Integrated Header: Title + Language Switch + Theme Toggle + Search Icon */}
          <View style={styles.integratedHeaderRow}>
            {/* Title */}
            <View style={{ flexShrink: 1, marginRight: 6 }}>
              <Text style={[styles.lookupTitle, { color: theme.text }]} numberOfLines={1}>
                {language === 'Telugu' ? 'బైబిల్ గ్రంథం' : 'Bible Reader'}
              </Text>
            </View>

            {/* Right Controls: Compact Language Pill + Theme Toggle + Search Button */}
            <View style={styles.headerControlsRight}>
              {/* Compact Language Toggle (Telugu / EN) */}
              <View style={[styles.compactLangBar, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.compactLangBtn, bibleVersion === 'Telugu' && { backgroundColor: theme.primary }]}
                  onPress={() => setBibleVersion('Telugu')}
                >
                  <Text style={[styles.compactLangBtnText, { color: bibleVersion === 'Telugu' ? '#ffffff' : theme.textSecondary }]}>
                    తెలుగు
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.compactLangBtn, bibleVersion === 'English' && { backgroundColor: theme.primary }]}
                  onPress={() => setBibleVersion('English')}
                >
                  <Text style={[styles.compactLangBtnText, { color: bibleVersion === 'English' ? '#ffffff' : theme.textSecondary }]}>
                    EN
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Compact Theme Mode Toggle Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.compactThemeBtn, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}
                onPress={() => setLocalThemeMode(currentThemeMode === 'dark' ? 'light' : 'dark')}
              >
                <MaterialCommunityIcons
                  name={currentThemeMode === 'dark' ? 'weather-sunny' : 'weather-night'}
                  size={19}
                  color={currentThemeMode === 'dark' ? '#FFD700' : theme.primary}
                />
              </TouchableOpacity>

              {/* Search Symbol Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.searchSymbolBtn, { backgroundColor: theme.primary }]}
                onPress={() => setVoiceSearchActive(true)}
              >
                <MaterialCommunityIcons name="magnify" size={21} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Dropdown Selectors for Book, Chapter, and Verse */}
          <View style={styles.dropdownRow}>
            {/* Book Picker */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.dropdownPicker, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}
              onPress={() => setBookModalVisible(true)}
            >
              <Text style={[styles.dropdownPickerLabel, { color: theme.textSecondary }]}>{language === 'Telugu' ? 'పుస్తకం' : 'Book'}</Text>
              <View style={styles.dropdownPickerValueRow}>
                <Text style={[styles.dropdownPickerValue, { color: theme.text }]} numberOfLines={1}>
                  {bibleVersion === 'Telugu' ? selectedBook.telugu : selectedBook.english}
                </Text>
                <MaterialCommunityIcons name="menu-down" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Chapter Picker */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.dropdownPicker, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}
              onPress={() => setChapterModalVisible(true)}
            >
              <Text style={[styles.dropdownPickerLabel, { color: theme.textSecondary }]}>{language === 'Telugu' ? 'అధ్యాయం' : 'Chapter'}</Text>
              <View style={styles.dropdownPickerValueRow}>
                <Text style={[styles.dropdownPickerValue, { color: theme.text }]}>{selectedChapter}</Text>
                <MaterialCommunityIcons name="menu-down" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Verse Picker */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.dropdownPicker, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}
              onPress={() => setVerseModalVisible(true)}
            >
              <Text style={[styles.dropdownPickerLabel, { color: theme.textSecondary }]}>{language === 'Telugu' ? 'వచనం' : 'Verse'}</Text>
              <View style={styles.dropdownPickerValueRow}>
                <Text style={[styles.dropdownPickerValue, { color: theme.text }]}>
                  {selectedVerse === 'All' ? (language === 'Telugu' ? 'అన్నీ' : 'All') : selectedVerse}
                </Text>
                <MaterialCommunityIcons name="menu-down" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Scripture Reader Block */}
          <View style={styles.versesContainer}>
            {errorBible ? (
              <Text style={styles.errorText}>{errorBible}</Text>
            ) : null}

            {loadingBible ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} />
            ) : (
              <View style={{ flex: 1 }}>
                <View style={[styles.passageCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                  <View style={styles.passageHeader}>
                    <Text style={[styles.passageName, { color: theme.text }]}>
                      📖 {bibleVersion === 'Telugu' ? selectedBook.telugu : selectedBook.english} {selectedChapter}{selectedVerse !== 'All' ? `:${selectedVerse}` : ''}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {/* Font Adjuster */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.backgroundElement, borderRadius: 8, paddingHorizontal: 4 }}>
                        <IconButton 
                          icon="minus" 
                          size={16} 
                          iconColor={theme.primary} 
                          style={{ margin: 0 }}
                          onPress={() => setFontSize(Math.max(12, fontSize - 2))} 
                        />
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, paddingHorizontal: 4 }}>{fontSize}</Text>
                        <IconButton 
                          icon="plus" 
                          size={16} 
                          iconColor={theme.primary} 
                          style={{ margin: 0 }}
                          onPress={() => setFontSize(Math.min(30, fontSize + 2))} 
                        />
                      </View>

                      {/* Share Button (Shares Selected Verses if any, or Full Chapter) */}
                      <IconButton 
                        icon="share-variant"
                        size={20}
                        iconColor={theme.primary}
                        style={{ margin: 0 }}
                        onPress={handleMainSharePress}
                      />
                    </View>
                  </View>
                  <Divider style={{ marginVertical: 8, backgroundColor: theme.cardBorder }} />
                  
                  {displayVerses.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginVertical: 24, color: theme.textSecondary, fontStyle: 'italic', fontSize: 14 }}>
                      {language === 'Telugu' ? 'వచనాలు ఏవీ కనుగొనబడలేదు.' : 'No matching verses found.'}
                    </Text>
                  ) : (
                    displayVerses.map((v, idx) => {
                      const isVerseSelected = !!selectedVersesMap[Number(v.verse)];
                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => toggleVerseSelection(v)}
                          style={[
                            styles.verseRow,
                            isVerseSelected && {
                              backgroundColor: (theme.primary + '22'),
                              borderRadius: 8,
                              paddingVertical: 6,
                              paddingHorizontal: 8,
                              borderColor: theme.primary,
                              borderWidth: 1,
                            }
                          ]}
                        >
                          <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
                            {isVerseSelected ? (
                              <MaterialCommunityIcons name="checkbox-marked-circle" size={16} color={theme.primary} />
                            ) : (
                              <Text style={[styles.verseNumber, { color: theme.textSecondary }]}>
                                {v.verse}
                              </Text>
                            )}
                          </View>

                          <Text style={[styles.verseText, { color: theme.text, fontSize, lineHeight: fontSize * 1.5 }]}>
                            {v.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {selectedVerse !== 'All' && (
                    <Button 
                      mode="outlined" 
                      compact
                      textColor={theme.primary}
                      style={{ marginTop: 8, borderColor: theme.primary }} 
                      onPress={() => setSelectedVerse('All')}
                    >
                      {language === 'Telugu' ? 'పూర్తి అధ్యాయాన్ని చూడండి' : 'Show Full Chapter'}
                    </Button>
                  )}
                </View>

                {/* Floating Multi-Verse Action Bar if 1 or more verses are selected */}
                {selectedCount > 0 && (
                  <View style={[styles.floatingVerseBar, { backgroundColor: theme.backgroundElement, borderColor: theme.primary }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }} numberOfLines={1}>
                        📖 {bibleVersion === 'Telugu' ? selectedBook.telugu : selectedBook.english} {selectedChapter} ({selectedCount} {language === 'Telugu' ? 'వచనాలు ఎంచుకోబడ్డాయి' : 'verses selected'})
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                        {Object.values(selectedVersesMap).map((v: any) => v.verse).join(', ')}
                      </Text>
                    </View>

                    <Button
                      mode="contained"
                      compact
                      icon="share-variant"
                      buttonColor={theme.primary}
                      textColor="#ffffff"
                      style={{ borderRadius: 8 }}
                      onPress={handleMainSharePress}
                    >
                      {language === 'Telugu' ? `షేర్ చేయి (${selectedCount})` : `Share (${selectedCount})`}
                    </Button>

                    <IconButton
                      icon="close-circle"
                      size={20}
                      iconColor={theme.textSecondary}
                      style={{ margin: 0 }}
                      onPress={() => setSelectedVersesMap({})}
                    />
                  </View>
                )}

                {/* Chapter Navigation Buttons Row */}
                <View style={styles.chapterNavButtonsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={!prevInfo}
                    style={[
                      styles.chapterNavBtn, 
                      { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                      !prevInfo && { opacity: 0.4 }
                    ]}
                    onPress={goToPrevChapter}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={20} color={theme.primary} />
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[styles.chapterNavSubtext, { color: theme.textSecondary }]}>
                        {language === 'Telugu' ? 'మునుపటిది' : 'Previous'}
                      </Text>
                      <Text style={[styles.chapterNavMainText, { color: theme.text }]} numberOfLines={1}>
                        {prevInfo || '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={!nextInfo}
                    style={[
                      styles.chapterNavBtn, 
                      { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, justifyContent: 'flex-end' },
                      !nextInfo && { opacity: 0.4 }
                    ]}
                    onPress={goToNextChapter}
                  >
                    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
                      <Text style={[styles.chapterNavSubtext, { color: theme.textSecondary }]}>
                        {language === 'Telugu' ? 'తదుపరిది' : 'Next'}
                      </Text>
                      <Text style={[styles.chapterNavMainText, { color: theme.text }]} numberOfLines={1}>
                        {nextInfo || '—'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>

                {/* Gesture Swipe Hint Badge */}
                <View style={[styles.gestureSwipeHint, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                  <MaterialCommunityIcons name="gesture-swipe-horizontal" size={16} color={theme.primary} />
                  <Text style={[styles.gestureSwipeHintText, { color: theme.textSecondary }]}>
                    {language === 'Telugu' 
                      ? '👉 కుడివైపు స్లైడ్: మునుపటి అధ్యాయం  |  ఎడమవైపు స్లైడ్: తదుపరి అధ్యాయం 👈' 
                      : '👉 Slide Right: Prev Chapter  |  Slide Left: Next Chapter 👈'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Custom Elegant Visual Separator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 18, paddingHorizontal: 16 }}>
          <View style={{ height: 1, flex: 1, backgroundColor: theme.cardBorder }} />
          <MaterialCommunityIcons name="cross" size={16} color={theme.primary} style={{ marginHorizontal: 10, opacity: 0.6 }} />
          <View style={{ height: 1, flex: 1, backgroundColor: theme.cardBorder }} />
        </View>

        {/* Today's Bible Study Plan & Streak Card */}
        {todayPortion && (
          <View style={[styles.studyPlanCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginBottom: 18 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {language === 'Telugu' ? 'నేటి బైబిల్ పఠన లక్ష్యం' : 'Today\'s Reading Target'}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginTop: 1 }}>
                  {language === 'Telugu' ? `దినము ${todayPortion.day} / 365` : `Day ${todayPortion.day} of 365`}
                </Text>
              </View>

              {/* Streak Badge */}
              <View style={[styles.streakBadge, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]}>
                <MaterialCommunityIcons name="fire" size={17} color="#e65100" />
                <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: '#e65100' }}>
                  {userProgress?.streak || 0} {language === 'Telugu' ? 'స్ట్రీక్' : 'Streak'}
                </Text>
              </View>
            </View>

            {/* Dates Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: theme.backgroundSelected, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
                📅 {language === 'Telugu' ? 'ప్రారంభం:' : 'Start:'} {userProgress?.startDate ? new Date(userProgress.startDate).toLocaleDateString(language === 'Telugu' ? 'te-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </Text>
              <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
                🏁 {language === 'Telugu' ? 'లక్ష్యం:' : 'Target:'} {userProgress?.targetEndDate ? new Date(userProgress.targetEndDate).toLocaleDateString(language === 'Telugu' ? 'te-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </Text>
            </View>

            <View style={{ backgroundColor: theme.backgroundSelected, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 12 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.text }}>
                📖 {todayPortion.versesSummary}
              </Text>
              <Text style={{ fontSize: 11.5, color: userProgress?.completedDays?.includes(todayPortion.day) ? '#2e7d32' : (hasCompletedQuizToday() ? '#0284c7' : (userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#0284c7' : theme.textSecondary)), fontWeight: '600', marginTop: 3 }}>
                {userProgress?.completedDays?.includes(todayPortion.day)
                  ? (language === 'Telugu' ? '🎉 ఈ రోజు పఠనం & 10 ప్రశ్నల క్విజ్ పూర్తయింది! రేపు తదుపరి దినపు వాక్యము అన్‌లాక్ అవుతుంది.' : '🎉 Today\'s reading & 10-question quiz completed! Tomorrow\'s portion unlocks tomorrow.')
                  : (hasCompletedQuizToday()
                      ? (language === 'Telugu' ? '📖 నేటి పఠనం చదవడానికి సిద్ధంగా ఉంది. క్విజ్ రేపు అన్‌లాక్ అవుతుంది!' : '📖 Today\'s portion is ready for reading. The quiz will unlock tomorrow!')
                      : (userProgress?.readMarkedDays?.includes(todayPortion.day)
                          ? (language === 'Telugu' ? '📖 వాక్యం చదవబడింది! ఇప్పుడు క్రింది క్విజ్ ప్రారంభించండి.' : '📖 Reading completed! You can now start the quiz below.')
                          : (language === 'Telugu' ? '👉 మొదట వాక్యం చదివి "చదివాను" అని నొక్కండి, ఆపై క్విజ్ ప్రారంభించండి.' : '👉 Read passage, tap "Mark as Read", then start quiz.')))}
              </Text>
            </View>

            {userProgress?.completedDays?.includes(todayPortion.day) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', gap: 8 }}>
                <MaterialCommunityIcons name="lock-clock" size={18} color="#16a34a" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a', flex: 1 }}>
                  {language === 'Telugu' ? '🔒 దినము 2 రేపు ఉదయం 12:00 AMకు అన్‌లాక్ అవుతుంది' : '🔒 Next day unlocks tomorrow at 12:00 AM'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.studyActionBtn,
                    {
                      backgroundColor: userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#e0f2fe' : theme.primary,
                      borderColor: userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#0284c7' : theme.primary,
                      borderWidth: 1,
                    }
                  ]}
                  onPress={async () => {
                    await biblePlanService.markDayAsRead(todayPortion.day, user?.id || 'guest_user', selectedBiblePlan || '1-year-canonical');
                    await loadPlanAndStreak();
                  }}
                >
                  <MaterialCommunityIcons 
                    name={userProgress?.readMarkedDays?.includes(todayPortion.day) ? 'checkbox-marked-circle' : 'book-check'} 
                    size={16} 
                    color={userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#0284c7' : '#ffffff'} 
                  />
                  <Text style={[styles.studyActionBtnText, { color: userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#0284c7' : '#ffffff' }]}>
                    {userProgress?.readMarkedDays?.includes(todayPortion.day) ? (language === 'Telugu' ? 'చదివాను ✅' : 'Read Marked ✅') : (language === 'Telugu' ? '1. చదివాను' : '1. Mark as Read')}
                  </Text>
                </TouchableOpacity>

                {hasCompletedQuizToday() ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={true}
                    style={[
                      styles.studyActionBtn,
                      {
                        backgroundColor: '#e5e7eb',
                        borderColor: '#d1d5db',
                        borderWidth: 1,
                        opacity: 0.65,
                      }
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="lock-clock"
                      size={16}
                      color="#9ca3af"
                    />
                    <Text style={[styles.studyActionBtnText, { color: '#9ca3af' }]}>
                      {language === 'Telugu' ? 'క్విజ్ రేపు' : 'Quiz Locks Tomorrow'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={!userProgress?.readMarkedDays?.includes(todayPortion.day)}
                    style={[
                      styles.studyActionBtn,
                      {
                        backgroundColor: !userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#e5e7eb' : theme.accentBackground,
                        borderColor: !userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#d1d5db' : theme.primary,
                        borderWidth: 1.5,
                        opacity: !userProgress?.readMarkedDays?.includes(todayPortion.day) ? 0.6 : 1,
                      }
                    ]}
                    onPress={() => setQuizModalVisible(true)}
                  >
                    <MaterialCommunityIcons
                      name={!userProgress?.readMarkedDays?.includes(todayPortion.day) ? 'lock-outline' : 'help-circle-outline'}
                      size={16}
                      color={!userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#9ca3af' : theme.primary}
                    />
                    <Text style={[styles.studyActionBtnText, { color: !userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#9ca3af' : theme.primary }]}>
                      {language === 'Telugu' ? '2. క్విజ్ (10 Q)' : '2. Start Quiz'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Dynamic bilingual scripture quote card */}
        <Card style={[styles.quoteCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginBottom: 20 }]}>
          <Card.Content style={{ paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <MaterialCommunityIcons name="format-quote-open" size={28} color={theme.accentBackground} />
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 15, 
                  fontStyle: 'italic', 
                  lineHeight: 22, 
                  color: theme.text,
                  fontWeight: '500',
                  marginBottom: 6
                }}>
                  {quoteText}
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  fontWeight: 'bold', 
                  color: theme.primary, 
                  textAlign: 'right' 
                }}>
                  — {todayQuote.ref}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Bible Study Reading Leaderboard Section */}
        <LeaderboardCard planId={selectedBiblePlan || '1-year-canonical'} appLanguage={language} refreshTrigger={leaderboardRefreshTrigger} />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Book Selection Modal */}
      <Portal>
        <Modal
          visible={bookModalVisible}
          onDismiss={() => setBookModalVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.modalTitle, { color: theme.primary }]}>{language === 'Telugu' ? 'పుస్తకాన్ని ఎంచుకోండి' : 'Select Book'}</Text>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ALL_BIBLE_BOOKS.map(b => {
              const bookDisplayName = bibleVersion === 'Telugu' ? b.telugu : b.english;
              const isSelected = selectedBook.english === b.english;
              return (
                <TouchableOpacity
                  key={b.english}
                  style={[styles.modalItem, { borderBottomColor: theme.cardBorder }, isSelected && { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setSelectedBook(b);
                    setSelectedChapter('1');
                    setSelectedVerse('All');
                    setBookModalVisible(false);
                    fetchBiblePassage(b.english, '1');
                  }}
                >
                  <Text style={[styles.modalItemText, { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? 'bold' : 'normal' }]}>{bookDisplayName}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Button mode="contained" buttonColor={theme.primary} textColor="#fff" onPress={() => setBookModalVisible(false)}>
            Close
          </Button>
        </Modal>
      </Portal>

      {/* Chapter Selection Modal */}
      <Portal>
        <Modal
          visible={chapterModalVisible}
          onDismiss={() => setChapterModalVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.modalTitle, { color: theme.primary }]}>{language === 'Telugu' ? 'అధ్యాయాన్ని ఎంచుకోండి' : 'Select Chapter'}</Text>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {chaptersArray.map(c => {
              const isSelected = selectedChapter === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.modalItem, { borderBottomColor: theme.cardBorder }, isSelected && { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setSelectedChapter(c);
                    setSelectedVerse('All');
                    setChapterModalVisible(false);
                    fetchBiblePassage(selectedBook.english, c);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? 'bold' : 'normal' }]}>
                    {language === 'Telugu' ? `అధ్యాయం ${c}` : `Chapter ${c}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Button mode="contained" buttonColor={theme.primary} textColor="#fff" onPress={() => setChapterModalVisible(false)}>
            Close
          </Button>
        </Modal>
      </Portal>

      {/* Verse Selection Modal */}
      <Portal>
        <Modal
          visible={verseModalVisible}
          onDismiss={() => setVerseModalVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.modalTitle, { color: theme.primary }]}>{language === 'Telugu' ? 'వచనాన్ని ఎంచుకోండి (వచనం)' : 'Select Verse'}</Text>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {versesArray.map(v => {
              const isSelected = selectedVerse === v;
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.modalItem, { borderBottomColor: theme.cardBorder }, isSelected && { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setSelectedVerse(v);
                    setVerseModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? 'bold' : 'normal' }]}>
                    {v === 'All' 
                      ? (language === 'Telugu' ? 'అన్ని వచనాలు (All)' : 'All Verses') 
                      : (language === 'Telugu' ? `వచనం ${v}` : `Verse ${v}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Button mode="contained" buttonColor={theme.primary} textColor="#fff" onPress={() => setVerseModalVisible(false)}>
            Close
          </Button>
        </Modal>
      </Portal>

      {/* 1. Entire Bible Search Results Popup Modal */}
      <Portal>
        <Modal
          visible={searchResultsModalVisible}
          onDismiss={() => setSearchResultsModalVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.backgroundElement, maxHeight: '82%' }]}
        >
          <Text style={[styles.modalTitle, { color: theme.primary }]}>
            {language === 'Telugu' ? 'బైబిల్ శోధన ఫలితాలు' : 'Bible Search Results'}
          </Text>
          {currentSearchTerm ? (
            <Text style={{ textAlign: 'center', fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              {language === 'Telugu' ? `"${currentSearchTerm}" కోసం ఫలితాలు` : `Results for "${currentSearchTerm}"`}
            </Text>
          ) : null}
          <Divider style={{ marginBottom: 10, backgroundColor: theme.cardBorder }} />
          
          {searchingBible ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ marginTop: 12, color: theme.textSecondary, fontSize: 13 }}>
                {language === 'Telugu' ? '66 పుస్తకాల బైబిలంతా శోధిస్తోంది...' : 'Searching entire 66-book Bible...'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                {language === 'Telugu' 
                  ? `${searchResults.length} ఫలితాలు కనుగొనబడ్డాయి (క్లిక్ చేసి చదవండి)` 
                  : `Found ${searchResults.length} matches (Tap to read)`}
              </Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {searchResults.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.textSecondary} />
                    <Text style={{ marginTop: 12, color: theme.textSecondary, textAlign: 'center', fontSize: 13, paddingHorizontal: 16 }}>
                      {language === 'Telugu' 
                        ? 'ఈ పదానికి సరిపోలే వచనాలు ఏవీ కనుగొనబడలేదు.' 
                        : 'No matching verses found across the Bible.'}
                    </Text>
                  </View>
                ) : (
                  searchResults.map((res, idx) => {
                    const bookName = bibleVersion === 'Telugu' ? res.book.telugu : res.book.english;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        style={{
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.cardBorder,
                        }}
                        onPress={() => handleSelectSearchResult(res)}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.primary }}>
                            📖 {bookName} {res.chapter}:{res.verse}
                          </Text>
                          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.primary} />
                        </View>
                        <Text style={{ fontSize: 13.5, color: theme.text, lineHeight: 19 }} numberOfLines={3}>
                          {res.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}

          <Button 
            mode="contained" 
            buttonColor={theme.primary} 
            textColor="#fff" 
            style={{ marginTop: 12, borderRadius: 10 }}
            onPress={() => setSearchResultsModalVisible(false)}
          >
            {language === 'Telugu' ? 'ముగించు' : 'Close'}
          </Button>
        </Modal>
      </Portal>

      {/* 2. Full Search Modal (Voice + Text Typing with Suggestions) */}
      <VoiceSearchModal
        visible={voiceSearchActive}
        onDismiss={() => setVoiceSearchActive(false)}
        onSearch={(query) => handleSearchEntireBible(query)}
        recentSearches={recentSearches}
        onClearRecentSearches={clearRecentSearches}
        appLanguage={language}
        initialLanguage={bibleVersion === 'Telugu' ? 'Telugu' : 'English'}
        titleTelugu="బైబిల్ శోధన (వాయిస్ / టైపింగ్)"
        titleEnglish="Bible Search (Voice / Text)"
      />

      {/* 3. Bible Reading Plan Quiz Modal */}
      {todayPortion && (
        <BibleQuizModal
          visible={quizModalVisible}
          onDismiss={() => setQuizModalVisible(false)}
          portion={todayPortion}
          planId={selectedBiblePlan || '1-year-canonical'}
          appLanguage={bibleLanguage}
          userId={user?.id || 'guest_user'}
          userName={user?.name || 'Member'}
          onQuizCompleted={() => {
            loadPlanAndStreak();
            setLeaderboardRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
  },
  studyPlanCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  studyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  studyActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  lookupCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
  },
  integratedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  lookupTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLangBar: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  compactLangBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLangBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactThemeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSymbolBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dropdownPicker: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  dropdownPickerLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dropdownPickerValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownPickerValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 14,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 14,
  },
  chapterNavButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  chapterNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  chapterNavSubtext: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chapterNavMainText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  gestureSwipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  gestureSwipeHintText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  versesContainer: {
    marginTop: 4,
  },
  passageCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  passageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passageName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  verseNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    width: 24,
    paddingTop: 2,
    textAlign: 'center',
  },
  verseText: {
    flex: 1,
  },
  floatingVerseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  quoteCard: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    overflow: 'hidden',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
});
