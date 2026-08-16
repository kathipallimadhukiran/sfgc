import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Platform, Share, TouchableOpacity, Modal, RefreshControl, FlatList, Dimensions, Linking, StatusBar, TextInput } from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Title, Paragraph, Button, Avatar, Text, ActivityIndicator } from 'react-native-paper';
import { useApp } from '@/context/AppContext';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import { biblePlanService, UserProgressData, DailyPromiseData } from '@/services/biblePlanService';
import { bibleService } from '@/services/bibleService';
import { DailyPortion } from '@/constants/defaultBiblePlans';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import { liveVideosService } from '@/services/liveVideosService';


interface HomeVideo {
  id: string;
  titleTel: string;
  titleEng: string;
  type: 'video';
  duration: string;
  thumbnail: string;
  url: string;
}

const VideoCarouselItem = React.memo(({ item }: { item: HomeVideo }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => Linking.openURL(item.url)}
    style={{ width: Dimensions.get('window').width - 32, height: 180, position: 'relative' }}
  >
    <Image
      source={{ uri: item.thumbnail }}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      transition={200}
    />
    <View style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -25 }, { translateY: -25 }], width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="play" size={32} color="#ffffff" style={{ marginLeft: 2 }} />
    </View>
  </TouchableOpacity>
));

export default function HomeScreen() {
  const { user, dailyVerse, events, notices, liveSession, joinLiveSession, leaveLiveSession, language, bibleLanguage, t, selectedBiblePlan, setSelectedBiblePlan, themeMode } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const isDark = themeMode === 'dark';
  const isTel = language === 'Telugu';
  const isBibleTel = bibleLanguage === 'Telugu';

  // Bible Reading Plan & Streak state
  const [todayPortion, setTodayPortion] = useState<DailyPortion | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgressData | null>(null);
  const [dailyPromise, setDailyPromise] = useState<DailyPromiseData | null>(null);

  // Motivation & plan selection modal states
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<'welcome' | 'selectPlan' | 'alreadyRead' | 'success'>('welcome');

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardRefreshTrigger, setLeaderboardRefreshTrigger] = useState(0);

  // Admin Daily Promise Manager State
  const canManagePromise = user && ['Admin', 'Super Admin', 'Event Coordinator', 'Notice Manager'].includes(user.role);
  const [promiseModalVisible, setPromiseModalVisible] = useState(false);
  const [promiseTel, setPromiseTel] = useState('');
  const [promiseEng, setPromiseEng] = useState('');
  const [refTel, setRefTel] = useState('');
  const [refEng, setRefEng] = useState('');
  const [promiseDate, setPromiseDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledPromisesList, setScheduledPromisesList] = useState<any[]>([]);
  const [savingPromise, setSavingPromise] = useState(false);

  const BIBLE_BOOKS_66 = [
    { nameTel: 'ఆదికాండము', nameEng: 'Genesis' }, { nameTel: 'నిర్గమకాండము', nameEng: 'Exodus' },
    { nameTel: 'లేవీయకాండము', nameEng: 'Leviticus' }, { nameTel: 'సంఖ్యాకాండము', nameEng: 'Numbers' },
    { nameTel: 'ద్వితీయోపదేశకాండము', nameEng: 'Deuteronomy' }, { nameTel: 'యెహోషువ', nameEng: 'Joshua' },
    { nameTel: 'న్యాయాధిపతులు', nameEng: 'Judges' }, { nameTel: 'రూతు', nameEng: 'Ruth' },
    { nameTel: '1 సమూయేలు', nameEng: '1 Samuel' }, { nameTel: '2 సమూయేలు', nameEng: '2 Samuel' },
    { nameTel: '1 రాజులు', nameEng: '1 Kings' }, { nameTel: '2 రాజులు', nameEng: '2 Kings' },
    { nameTel: '1 దినవృత్తాంతములు', nameEng: '1 Chronicles' }, { nameTel: '2 దినవృత్తాంతములు', nameEng: '2 Chronicles' },
    { nameTel: 'ఎజ్రా', nameEng: 'Ezra' }, { nameTel: 'నెహెమ్యా', nameEng: 'Nehemiah' },
    { nameTel: 'ఎస్తేరు', nameEng: 'Esther' }, { nameTel: 'యోబు', nameEng: 'Job' },
    { nameTel: 'కీర్తనలు', nameEng: 'Psalms' }, { nameTel: 'సామెతలు', nameEng: 'Proverbs' },
    { nameTel: 'ప్రసంగి', nameEng: 'Ecclesiastes' }, { nameTel: 'పరమగీతము', nameEng: 'Song of Solomon' },
    { nameTel: 'యెషయా', nameEng: 'Isaiah' }, { nameTel: 'యిర్మీయా', nameEng: 'Jeremiah' },
    { nameTel: 'విలాపవాక్యములు', nameEng: 'Lamentations' }, { nameTel: 'యెహెజ్కేలు', nameEng: 'Ezekiel' },
    { nameTel: 'దానియేలు', nameEng: 'Daniel' }, { nameTel: 'హోషేయ', nameEng: 'Hosea' },
    { nameTel: 'యోవేలు', nameEng: 'Joel' }, { nameTel: 'ఆమోసు', nameEng: 'Amos' },
    { nameTel: 'ఓబద్యా', nameEng: 'Obadiah' }, { nameTel: 'యోనా', nameEng: 'Jonah' },
    { nameTel: 'మీకా', nameEng: 'Micah' }, { nameTel: 'నహూము', nameEng: 'Nahum' },
    { nameTel: 'హబక్కూకు', nameEng: 'Habakkuk' }, { nameTel: 'జెఫన్యా', nameEng: 'Zephaniah' },
    { nameTel: 'హగ్గయి', nameEng: 'Haggai' }, { nameTel: 'జెకర్యా', nameEng: 'Zechariah' },
    { nameTel: 'మలాకీ', nameEng: 'Malachi' },
    { nameTel: 'మత్తయి', nameEng: 'Matthew' }, { nameTel: 'మార్కు', nameEng: 'Mark' },
    { nameTel: 'లూకా', nameEng: 'Luke' }, { nameTel: 'యోహాను', nameEng: 'John' },
    { nameTel: 'అపోస్తుల కార్యములు', nameEng: 'Acts' }, { nameTel: 'రోమీయులకు', nameEng: 'Romans' },
    { nameTel: '1 కొరింథీయులకు', nameEng: '1 Corinthians' }, { nameTel: '2 కొరింథీయులకు', nameEng: '2 Corinthians' },
    { nameTel: 'గలతీయులకు', nameEng: 'Galatians' }, { nameTel: 'ఎఫెసీయులకు', nameEng: 'Ephesians' },
    { nameTel: 'ఫిలిప్పీయులకు', nameEng: 'Philippians' }, { nameTel: 'కొలస్సీయులకు', nameEng: 'Colossians' },
    { nameTel: '1 దెస్సలొనీకయులకు', nameEng: '1 Thessalonians' }, { nameTel: '2 దెస్సలొనీకయులకు', nameEng: '2 Thessalonians' },
    { nameTel: '1 తిమోతికి', nameEng: '1 Timothy' }, { nameTel: '2 తిమోతికి', nameEng: '2 Timothy' },
    { nameTel: 'తీతుకు', nameEng: 'Titus' }, { nameTel: 'ఫిలేమోనుకు', nameEng: 'Philemon' },
    { nameTel: 'హెబ్రీయులకు', nameEng: 'Hebrews' }, { nameTel: 'యాకోబు', nameEng: 'James' },
    { nameTel: '1 పేతురు', nameEng: '1 Peter' }, { nameTel: '2 పేతురు', nameEng: '2 Peter' },
    { nameTel: '1 యోహాను', nameEng: '1 John' }, { nameTel: '2 యోహాను', nameEng: '2 John' },
    { nameTel: '3 యోహాను', nameEng: '3 John' }, { nameTel: 'యూదా', nameEng: 'Jude' },
    { nameTel: 'ప్రకటన', nameEng: 'Revelation' }
  ];

  // Canonical Bible Book selection state using bibleService
  const allBibleBooks = bibleService.getBooks();
  
  const [selectedBook, setSelectedBook] = useState<any>(allBibleBooks[18] || allBibleBooks[0]); // Default to Psalms (index 18)
  const [selectedChapter, setSelectedChapter] = useState('23');
  const [selectedVerse, setSelectedVerse] = useState('1');
  const [availableChapters, setAvailableChapters] = useState<number[]>(Array.from({ length: 150 }, (_, i) => i + 1));
  const [availableVerses, setAvailableVerses] = useState<number[]>(Array.from({ length: 30 }, (_, i) => i + 1));

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [verseModalOpen, setVerseModalOpen] = useState(false);
  const [bookSearchText, setBookSearchText] = useState('');

  const [allAvailablePlans, setAllAvailablePlans] = useState<any[]>([]);

  const routeParams = useLocalSearchParams<{ autoOpenPromise?: string; book?: string; chapter?: string; verse?: string; returnToBible?: string }>();
  const [returnToBibleAfterPromise, setReturnToBibleAfterPromise] = useState(false);

  useEffect(() => {
    biblePlanService.getAllPlans().then(plans => {
      if (plans && plans.length > 0) setAllAvailablePlans(plans);
    });
  }, []);

  useEffect(() => {
    if (routeParams?.autoOpenPromise === 'true') {
      setPromiseModalVisible(true);
      fetchScheduledPromisesList();
      if (routeParams.returnToBible === 'true') {
        setReturnToBibleAfterPromise(true);
      }
      if (routeParams.book && routeParams.chapter && routeParams.verse) {
        const foundBook = bibleService.getBook(routeParams.book);
        loadPassageForSelection(foundBook, routeParams.chapter, routeParams.verse);
      }
    }
  }, [routeParams?.autoOpenPromise, routeParams?.book, routeParams?.chapter, routeParams?.verse, routeParams?.returnToBible]);

  // Update dynamic chapters & verses when book, chapter or verse changes
  const loadPassageForSelection = async (bookObj: any, chVal: string | number, vVal: string | number) => {
    const targetBook = bookObj || selectedBook || allBibleBooks[0];
    const maxCh = bibleService.getChapterCount(targetBook.english);
    
    // Build chapter list for dropdown
    const chList = Array.from({ length: maxCh }, (_, i) => i + 1);
    setAvailableChapters(chList);

    const validCh = Math.min(Math.max(1, Number(chVal) || 1), maxCh);

    // Fetch passage from bundled offline Bible dataset
    const passage = await bibleService.getPassage(targetBook.english, validCh.toString());
    const totalVerses = Math.max(passage.tel.length, passage.eng.length, 1);
    
    // Build verse list for dropdown
    const vList = Array.from({ length: totalVerses }, (_, i) => i + 1);
    setAvailableVerses(vList);

    const validVerseNum = Math.min(Math.max(1, Number(vVal) || 1), totalVerses);

    setSelectedBook(targetBook);
    setSelectedChapter(validCh.toString());
    setSelectedVerse(validVerseNum.toString());

    // Update canonical reference strings
    const rTel = `${targetBook.telugu} ${validCh}:${validVerseNum}`;
    const rEng = `${targetBook.english} ${validCh}:${validVerseNum}`;
    setRefTel(rTel);
    setRefEng(rEng);

    // Extract exact verse text from Bible dataset for both Telugu & English
    const telVerseObj = passage.tel.find(v => Number(v.verse) === validVerseNum);
    const engVerseObj = passage.eng.find(v => Number(v.verse) === validVerseNum);

    if (telVerseObj && telVerseObj.text) {
      setPromiseTel(telVerseObj.text.trim());
    } else {
      setPromiseTel('');
    }

    if (engVerseObj && engVerseObj.text) {
      setPromiseEng(engVerseObj.text.trim());
    } else {
      setPromiseEng('');
    }
  };

  const handleBookSelect = (bookObj: any) => {
    loadPassageForSelection(bookObj, 1, 1);
    setBookModalOpen(false);
    setBookSearchText('');
  };

  const handleChapterSelect = (chNum: number) => {
    loadPassageForSelection(selectedBook, chNum, 1);
    setChapterModalOpen(false);
  };

  const handleVerseSelect = (vNum: number) => {
    loadPassageForSelection(selectedBook, selectedChapter, vNum);
    setVerseModalOpen(false);
  };

  const handleEditScheduledPromise = (item: any) => {
    setPromiseDate(item.date);
    setPromiseTel(item.verseTelugu || '');
    setPromiseEng(item.verseEnglish || '');
    setRefTel(item.referenceTelugu || '');
    setRefEng(item.referenceEnglish || '');

    // Restore Book, Chapter, Verse dropdowns
    if (item.bookEnglish || item.referenceEnglish) {
      const bookName = item.bookEnglish || (item.referenceEnglish ? item.referenceEnglish.split(' ')[0] : 'Psalms');
      const foundBook = bibleService.getBook(bookName);
      const ch = item.chapter ? item.chapter.toString() : (item.referenceEnglish ? (item.referenceEnglish.match(/\d+:/)?.[0]?.replace(':', '') || '1') : '1');
      const v = item.verse ? item.verse.toString() : (item.referenceEnglish ? (item.referenceEnglish.match(/:\d+/)?.[0]?.replace(':', '') || '1') : '1');
      
      setSelectedBook(foundBook);
      setSelectedChapter(ch);
      setSelectedVerse(v);
      const maxCh = bibleService.getChapterCount(foundBook.english);
      setAvailableChapters(Array.from({ length: maxCh }, (_, i) => i + 1));
    }
  };

  const closePromiseManager = () => {
    setPromiseModalVisible(false);
    if (returnToBibleAfterPromise) {
      setReturnToBibleAfterPromise(false);
      router.push({
        pathname: '/bible',
        params: {
          autoOpenBook: selectedBook?.english,
          autoOpenChapter: selectedChapter,
        }
      });
    }
  };

  const openPromiseManager = async () => {
    setPromiseModalVisible(true);
    fetchScheduledPromisesList();
    loadPassageForSelection(selectedBook || allBibleBooks[18], selectedChapter || '23', selectedVerse || '1');
    setPromiseDate(new Date().toISOString().split('T')[0]);
  };

  const fetchScheduledPromisesList = async () => {
    try {
      const list = await biblePlanService.getScheduledPromises();
      setScheduledPromisesList(list);
    } catch (e) {}
  };

  const handleSaveDailyPromise = async () => {
    if (!promiseTel.trim() || !refTel.trim()) {
      alert('Please select a valid Bible reference and ensure Telugu verse text is present.');
      return;
    }
    setSavingPromise(true);
    try {
      const res = await biblePlanService.saveDailyPromise({
        date: promiseDate,
        bookId: selectedBook?.english || '',
        bookTelugu: selectedBook?.telugu || '',
        bookEnglish: selectedBook?.english || '',
        chapter: Number(selectedChapter) || 1,
        verse: Number(selectedVerse) || 1,
        verseTelugu: promiseTel.trim(),
        verseEnglish: promiseEng.trim(),
        referenceTelugu: refTel.trim(),
        referenceEnglish: refEng.trim(),
      });

      if (res.success) {
        alert(`Promise scheduled successfully for ${promiseDate}.\nNotification will be sent at 5:00 AM on the scheduled date.`);
        await loadDailyPromise();
        await fetchScheduledPromisesList();
        if (returnToBibleAfterPromise) {
          closePromiseManager();
        }
      } else {
        alert(res.message || 'Failed to save promise.');
      }
    } catch (err: any) {
      alert(`Error saving promise: ${err.message}`);
    } finally {
      setSavingPromise(false);
    }
  };

  const handleDeleteScheduledPromise = async (dateStr: string) => {
    const ok = await biblePlanService.deleteDailyPromise(dateStr);
    if (ok) {
      alert(`Deleted promise for ${dateStr}`);
      fetchScheduledPromisesList();
      loadDailyPromise();
    }
  };

  // YouTube Slider state
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [recentVideos, setRecentVideos] = useState<HomeVideo[]>([]);
  const videoFlatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (recentVideos.length < 2) return;
    const interval = setInterval(() => {
      try {
        const nextIndex = (activeVideoIndex + 1) % recentVideos.length;
        setActiveVideoIndex(nextIndex);
        videoFlatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      } catch (e) {}
    }, 4500); // auto-slide every 4.5 seconds

    return () => clearInterval(interval);
  }, [activeVideoIndex, recentVideos.length]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      liveVideosService.getVideos().then(result => {
        if (!isActive || !result.success) return;
        const nowMs = Date.now();
        const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

        const getVideoTime = (v: any) => {
          if (v.publishedAt) {
            const t = new Date(v.publishedAt).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (v.createdAt) {
            const t = new Date(v.createdAt).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (v._id && typeof v._id === 'string' && v._id.length === 24) {
            const t = parseInt(v._id.substring(0, 8), 16) * 1000;
            if (!isNaN(t) && t > 0) return t;
          }
          return 0;
        };

        const sortedVideos = [...(result.videos || [])].sort((a: any, b: any) => getVideoTime(b) - getVideoTime(a));

        const filtered5Days = sortedVideos.filter((v: any) => {
          const pubDate = v.publishedAt || v.createdAt;
          if (!pubDate) return true;
          const pubMs = new Date(pubDate).getTime();
          return (nowMs - pubMs) <= FIVE_DAYS_MS;
        }).slice(0, 5);

        // Fallback to top 5 if no videos in last 5 days
        const targetVideos = filtered5Days.length > 0 ? filtered5Days : sortedVideos.slice(0, 5);

        setRecentVideos(targetVideos.map((video: any) => {
          const cleanTitle = (video.title || 'Church Video')
            .replace(/#\w+/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          return {
            id: video._id || video.id,
            titleTel: cleanTitle,
            titleEng: cleanTitle,
            type: 'video',
            duration: '',
            thumbnail: video.thumbnail,
            url: video.youtubeUrl,
          };
        }));
      });

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleVideoScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    if (slideSize > 0) {
      const index = Math.round(offset / slideSize);
      setActiveVideoIndex(index);
    }
  };

  useEffect(() => {
    joinLiveSession();
    loadDailyPromise();
    loadPlanAndStreak();
    return () => {
      leaveLiveSession();
    };
  }, [selectedBiblePlan, user, language, bibleLanguage]);

  useEffect(() => {
    const checkPlanPrompt = async () => {
      try {
        const hasShown = await AsyncStorage.getItem('hasShownPlanPrompt');
        if (!hasShown) {
          setTimeout(() => {
            setPlanModalVisible(true);
          }, 1500);
        }
      } catch (e) {
        console.log('Error checking plan prompt:', e);
      }
    };
    checkPlanPrompt();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadPlanAndStreak();
      loadDailyPromise();
      setLeaderboardRefreshTrigger(prev => prev + 1);
    }, [selectedBiblePlan])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPlanAndStreak(),
        loadDailyPromise(),
        joinLiveSession(),
      ]);
      setLeaderboardRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.log('Error refreshing home screen:', e);
    } finally {
      setRefreshing(false);
    }
  };

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
      const prog = await biblePlanService.getUserProgress(user?.id || 'guest_user', activePlan);
      setUserProgress(prog);
      const portion = await biblePlanService.getTodayPortion(activePlan, prog.currentDay);
      setTodayPortion(portion);
    } catch (e) {
      console.log('Error loading plan progress:', e);
    }
  };

  const loadDailyPromise = async () => {
    try {
      const p = await biblePlanService.getDailyPromise();
      setDailyPromise(p);
    } catch (e) {
      console.log('Error loading daily promise:', e);
    }
  };

  const handleShareVerse = async () => {
    try {
      const verseText = isBibleTel ? (dailyPromise?.verseTelugu || dailyVerse) : (dailyPromise?.verseEnglish || dailyVerse);
      const refText = isBibleTel ? (dailyPromise?.referenceTelugu || '') : (dailyPromise?.referenceEnglish || '');
      await Share.share({
        message: `🕊️ *${isTel ? 'నేటి దేవుని వాగ్దానము' : 'Today\'s God\'s Promise'}* 🕊️\n\n"${verseText}"\n${refText ? `— ${refText}` : ''}\n\nShared from SFGC Mobile App.`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return t.goodMorning;
    if (hrs < 17) return t.goodAfternoon;
    return t.goodEvening;
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString(language === 'Telugu' ? 'te-IN' : 'en-US', options);
  };

  const isTodayCompleted = todayPortion && userProgress?.completedDays?.includes(todayPortion.day);
  const isTodayRead = todayPortion && (userProgress?.readMarkedDays?.includes(todayPortion.day) || isTodayCompleted);

  // Daily Promise text follows Bible Language setting
  const displayPromiseVerse = isBibleTel ? (dailyPromise?.verseTelugu || dailyVerse) : (dailyPromise?.verseEnglish || dailyVerse);
  const displayPromiseRef = isBibleTel ? (dailyPromise?.referenceTelugu || '') : (dailyPromise?.referenceEnglish || '');

  const formatShortDate = (dStr?: string) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString(language === 'Telugu' ? 'te-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      >
      
      {/* Top Header Section */}
      <View style={styles.greetingHeader}>
        <View>
          <Text style={[styles.greetingText, { color: theme.textSecondary }]}>{getGreeting()},</Text>
          <Text style={[styles.usernameText, { color: theme.text }]}>{user ? user.name : t.guest} 👋</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[styles.dateText, { color: theme.primary, backgroundColor: theme.accentBackground }]}>{formatDate()}</Text>
        </View>
      </View>

      {/* Live Lyrics Alerts Banner */}
      {liveSession && (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => router.push('/live-lyrics')}
          style={{ marginBottom: 20 }}
        >
          <LinearGradient
            colors={['#8b5cf6', '#ec4899']}
            style={styles.liveContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveBadgeText}>{t.liveWorship}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
            </View>
            <Title style={styles.liveTitle}>{t.join}</Title>
            <Paragraph style={styles.liveSubtitle}>
              {t.currentSong}: {liveSession.song?.title || 'Worship Song'}
            </Paragraph>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Daily God's Promise Card (Follows Bible Language Preference) */}
      <View style={[styles.verseCardContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <View style={styles.verseDecorationLeft}>
          <MaterialCommunityIcons name="format-quote-open" size={28} color={theme.accentBackground} />
        </View>
        <Text style={[styles.verseText, { color: theme.text }]}>
          {displayPromiseVerse}
        </Text>
        {displayPromiseRef ? (
          <Text style={{ textAlign: 'right', fontSize: 12, fontWeight: 'bold', color: theme.primary, marginTop: 6, paddingRight: 8 }}>
            — {displayPromiseRef}
          </Text>
        ) : null}
        <View style={styles.verseDecorationRight}>
          <MaterialCommunityIcons name="format-quote-close" size={28} color={theme.accentBackground} />
        </View>
        <View style={[styles.verseFooter, { borderTopColor: theme.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={16} color={theme.primary} />
            <Text style={[styles.verseFooterLabel, { color: theme.primary }]}>
              {isTel ? 'నేటి దేవుని వాగ్దానము' : 'Today\'s God\'s Promise'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {canManagePromise && (
              <TouchableOpacity onPress={openPromiseManager} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="pencil" size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleShareVerse} style={styles.shareIconBtn}>
              <MaterialCommunityIcons name="share-variant" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Auto-sliding YouTube Videos & Shorts Carousel */}
      <View style={{ marginBottom: 20 }}>
        {/* Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 4 }}>
          <MaterialCommunityIcons name="youtube" size={22} color="#ff0000" />
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>
            {isTel ? 'తాజా యూట్యూబ్ వీడియోలు & షార్ట్స్' : 'Recent YouTube Videos & Shorts'}
          </Text>
        </View>

        {/* Carousel Container */}
        <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }}>
          <FlatList
            ref={videoFlatListRef}
            data={recentVideos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={3}
            removeClippedSubviews={Platform.OS === 'android'}
            getItemLayout={(data, index) => ({
              length: Dimensions.get('window').width - 32,
              offset: (Dimensions.get('window').width - 32) * index,
              index,
            })}
            onMomentumScrollEnd={handleVideoScroll}
            renderItem={({ item }) => <VideoCarouselItem item={item} />}
          />

          {/* Dots Indicator */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8, backgroundColor: theme.backgroundElement }}>
            {recentVideos.map((_, index) => (
              <View
                key={index}
                style={{
                  width: activeVideoIndex === index ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: activeVideoIndex === index ? theme.primary : theme.textSecondary,
                  opacity: activeVideoIndex === index ? 1 : 0.4,
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Interactive Bible Study Plan Card */}
      <View style={[styles.planCardContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        {!selectedBiblePlan ? (
          /* Motivation & Onboarding Call-To-Action */
          <View style={{ paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={[styles.modalIconBg, { backgroundColor: theme.accentBackground, width: 44, height: 44, borderRadius: 22, marginBottom: 0 }]}>
                <MaterialCommunityIcons name="book-open-page-variant" size={24} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                {isTel ? 'బైబిల్ పఠన ప్రణాళిక 📖' : 'Bible Reading Plan 📖'}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginBottom: 16 }}>
              {isTel
                ? 'ప్రతిరోజూ దేవుని వాక్యాన్ని ధ్యానించడం మీ ఆత్మీయ జీవితాన్ని బలపరుస్తుంది. ఈరోజే ఒక పఠన ప్రణాళికను ఎంచుకోండి!'
                : 'Reading God\'s Word daily strengthens your spiritual life. Choose a study plan today to get started!'}
            </Text>
            <TouchableOpacity
              style={[styles.planBtn, { backgroundColor: theme.primary, marginTop: 0 }]}
              onPress={() => {
                setModalStep('selectPlan');
                setPlanModalVisible(true);
              }}
            >
              <MaterialCommunityIcons name="calendar-check" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.planBtnText}>
                {isTel ? 'ప్రణాళికను ఎంచుకోండి' : 'Choose a Study Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Show Active Plan & Today's Target Portion */
          todayPortion && (
            <>
              {/* Header Row: Title & Streak Badge */}
              <View style={styles.planHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planLabel, { color: theme.textSecondary }]}>
                    {selectedBiblePlan === '2-year-canonical' 
                      ? (isTel ? '2 సంవత్సరాల సులభమైన బైబిల్ పఠనం' : '2-Year Bible Reading Plan')
                      : (isTel ? '1 సంవత్సర సమగ్ర బైబిల్ పఠనం' : '1-Year Bible Reading Plan')}
                  </Text>
                  <Text style={[styles.planDayText, { color: theme.text }]}>
                    {isTel ? `దినము ${todayPortion.day} / ${selectedBiblePlan === '2-year-canonical' ? '730' : '365'}` : `Day ${todayPortion.day} of ${selectedBiblePlan === '2-year-canonical' ? '730' : '365'}`}
                  </Text>
                </View>

                {/* Streak Badge */}
                <View style={[styles.streakBadge, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]}>
                  <MaterialCommunityIcons name="fire" size={18} color="#e65100" />
                  <Text style={styles.streakText}>
                    {userProgress?.streak || 0} {isTel ? 'స్ట్రీక్' : 'Streak'}
                  </Text>
                </View>
              </View>

              {/* Dates Bar (Start Date & Target Completion Date) */}
              <View style={[styles.datesBar, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
                  📅 {isTel ? 'ప్రారంభం:' : 'Start:'} {formatShortDate(userProgress?.startDate)}
                </Text>
                <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
                  🏁 {isTel ? 'లక్ష్యం:' : 'Target:'} {formatShortDate(userProgress?.targetEndDate)}
                </Text>
              </View>

              {/* Today's Reading Passage Box */}
              <View style={[styles.portionBox, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="book-open-variant" size={24} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.portionSummary, { color: theme.text }]}>
                      {isBibleTel ? todayPortion.versesSummary : (todayPortion.book + ' ' + todayPortion.startChapter + (todayPortion.startChapter !== todayPortion.endChapter ? `–${todayPortion.endChapter}` : ''))}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isTodayCompleted ? '#2e7d32' : (hasCompletedQuizToday() ? '#0284c7' : theme.textSecondary), fontWeight: '600', marginTop: 3 }}>
                      {isTodayCompleted
                        ? (isTel ? '🎉 అద్భుతం! నేటి పఠనం & క్విజ్ పూర్తయింది. రేపటి కోసం టెస్ట్ లాక్ చేయబడింది.' : '🎉 Great job! Today\'s reading & quiz completed. Test locked for tomorrow.')
                        : (hasCompletedQuizToday()
                            ? (isTel ? '📖 నేటి క్విజ్ పూర్తయింది. రేపటి కోసం టెస్ట్ లాక్ చేయబడింది!' : '📖 Today\'s quiz completed! Test locked for tomorrow.')
                            : (isTel ? '👉 వాక్యం చదవడానికి "వాక్యం చదవండి" అని నొక్కండి. చదివిన తర్వాత క్రింద "చదివాను" అని గుర్తించి క్విజ్ రాయండి.' : '👉 Tap "Go to Read" to read today\'s chapters in Bible, then mark as read to take quiz.'))}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action: Go to Read & Mark as Read Buttons / Locked Tomorrow Status */}
              {isTodayCompleted ? (
                <View style={[styles.lockedTomorrowBanner, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.18)' : '#f0fdf4', borderColor: isDark ? '#15803d' : '#86efac', paddingVertical: 12 }]}>
                  <MaterialCommunityIcons name="lock-clock" size={20} color={isDark ? '#4ade80' : '#16a34a'} />
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: isDark ? '#4ade80' : '#16a34a', flex: 1 }}>
                    {isTel ? `🔒 రేపటి కోసం టెస్ట్ లాక్ చేయబడింది` : `🔒 Test Locked for Tomorrow`}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: '/bible', params: { autoOpenChapter: todayPortion.startChapter, autoOpenBook: todayPortion.book } })}
                    style={[styles.planBtn, { flex: 1, backgroundColor: theme.primary }]}
                  >
                    <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#ffffff" />
                    <Text style={[styles.planBtnText, { fontSize: 12 }]}>
                      {isTel ? 'వాక్యం చదవండి' : 'Go to Read'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    activeOpacity={0.85}
                    onPress={async () => {
                      await biblePlanService.markDayAsRead(todayPortion.day, user?.id || 'guest_user', selectedBiblePlan || '1-year-canonical');
                      await loadPlanAndStreak();
                    }}
                    style={[
                      styles.planBtn, 
                      { 
                        flex: 1, 
                        backgroundColor: userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#e0f2fe' : '#10b981',
                      }
                    ]}
                  >
                    <MaterialCommunityIcons 
                      name={userProgress?.readMarkedDays?.includes(todayPortion.day) ? 'checkbox-marked-circle' : 'check-circle-outline'} 
                      size={16} 
                      color={userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#0284c7' : '#ffffff'} 
                    />
                    <Text style={[styles.planBtnText, { fontSize: 12, color: userProgress?.readMarkedDays?.includes(todayPortion.day) ? '#0284c7' : '#ffffff' }]}>
                      {userProgress?.readMarkedDays?.includes(todayPortion.day) ? (isTel ? 'చదివాను ✅' : 'Read ✅') : (isTel ? 'చదివాను మార్క్' : 'Mark as Read')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )
        )}
      </View>

      {/* Bible Study Reading Leaderboard Section */}
      <LeaderboardCard 
        planId={selectedBiblePlan || '1-year-canonical'} 
        appLanguage={language} 
        refreshTrigger={leaderboardRefreshTrigger}
      />

      {/* Section: Upcoming Services / Events */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={theme.text} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.events}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/events')}>
          <Text style={[styles.viewAllBtn, { color: theme.primary }]}>{t.viewAll}</Text>
        </TouchableOpacity>
      </View>
      
      {(() => {
        const activeHomeEvents = (events || [])
          .filter(e => new Date(e.date).getTime() + 4 * 3600 * 1000 >= Date.now())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return activeHomeEvents && activeHomeEvents.length > 0 ? (
          activeHomeEvents.slice(0, 2).map((evt) => {
            const d = new Date(evt.date);
            const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          return (
            <TouchableOpacity 
              activeOpacity={0.85}
              key={evt._id}
              onPress={() => router.push('/events')}
              style={[styles.eventCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, overflow: 'hidden' }]}
            >
              {Boolean(evt.banner || evt.imageUrl) ? (
                <Image
                  source={{ uri: evt.banner || evt.imageUrl }}
                  style={{ width: 56, height: 56, borderRadius: 8, margin: 10, marginRight: 2 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.eventCalendarBox, { backgroundColor: theme.accentBackground, borderColor: theme.accentBackground }]}>
                  <Text style={[styles.eventCalendarDay, { color: theme.primary }]}>{String(d.getDate()).padStart(2, '0')}</Text>
                  <Text style={[styles.eventCalendarMonth, { color: theme.primary }]}>{d.toLocaleString([], { month: 'short' }).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{evt.title}</Text>
                <View style={styles.eventMetaRow}>
                  <View style={styles.metaIconText}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.eventMetaText, { color: theme.textSecondary }]}>{formattedTime}</Text>
                  </View>
                  <View style={[styles.metaIconText, { marginLeft: 12 }]}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.eventMetaText, { color: theme.textSecondary }]}>{evt.venue}</Text>
                  </View>
                </View>
                {evt.speaker && (
                  <Text style={[styles.eventSpeaker, { color: theme.accent }]}>🎙️ {t.speaker}: {evt.speaker}</Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} style={{ alignSelf: 'center', marginRight: 10 }} />
            </TouchableOpacity>
          )
        })
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t.emptyEvents}</Text>
        </View>
      );
    })()}

      {/* Section: Latest Notices */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="bell-ring-outline" size={20} color={theme.text} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.notices}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Text style={[styles.viewAllBtn, { color: theme.primary }]}>{t.viewAll}</Text>
        </TouchableOpacity>
      </View>

      {notices && notices.length > 0 ? (
        notices.slice(0, 2).map((notice) => (
          <View style={[styles.noticeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} key={notice._id}>
            <View style={[styles.noticeIconCircle, { backgroundColor: theme.primary }]}>
              <MaterialCommunityIcons 
                name={notice.title.toLowerCase().includes('fellowship') ? 'account-group' : 'bell'} 
                size={20} 
                color="#ffffff" 
              />
            </View>
            <View style={styles.noticeContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.noticeTitle, { color: theme.text }]} numberOfLines={1}>{notice.title}</Text>
                <Text style={[styles.noticeDate, { color: theme.textSecondary }]}>
                  {new Date(notice.date || new Date()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <Text style={[styles.noticeDesc, { color: theme.textSecondary }]} numberOfLines={2}>{notice.description}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t.emptyNotices}</Text>
        </View>
      )}

      {/* Leaderboard Section at Bottom */}
    
      <View style={{ height: 40 }} />
    </ScrollView>

    {/* Motivation & Bible Plan Prompt Modal */}
    <Modal
      visible={planModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setPlanModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}>
          
          {modalStep === 'welcome' && (
            <View style={styles.modalStepContainer}>
              <View style={[styles.modalIconBg, { backgroundColor: theme.accentBackground }]}>
                <MaterialCommunityIcons name="book-open-page-variant" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {isTel ? 'మీ ఆధ్యాత్మిక ప్రయాణాన్ని ప్రారంభించండి! 📖' : 'Begin Your Spiritual Journey! 📖'}
              </Text>
              <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                {isTel
                  ? "దేవుని వాక్యమును ధ్యానించడం జ్ఞానమును, సమాధానమును మరియు ఆశీర్వాదాలను ఇస్తుంది. ప్రతిరోజూ బైబిల్ చదవడం అలవాటు చేసుకుందాం!"
                  : "Meditation on God's Word brings wisdom, peace, and blessings. Let's make Bible study a daily habit!"}
              </Text>
              
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: theme.primary }]}
                onPress={() => setModalStep('selectPlan')}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {isTel ? 'నేను చదవడానికి ప్లాన్ చేస్తున్నాను' : 'I am planning to read'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: theme.primary }]}
                onPress={() => setModalStep('alreadyRead')}
              >
                <Text style={[styles.modalBtnTextSecondary, { color: theme.primary }]}>
                  {isTel ? 'నేను ఇప్పటికే చదివాను!' : 'I have already read it!'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {modalStep === 'selectPlan' && (
            <View style={styles.modalStepContainer}>
              <View style={[styles.modalIconBg, { backgroundColor: theme.accentBackground }]}>
                <MaterialCommunityIcons name="calendar-clock" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {isTel ? 'పఠన ప్రణాళికను ఎంచుకోండి' : 'Choose Your Study Plan'}
              </Text>
              <Text style={[styles.modalDescription, { color: theme.textSecondary, marginBottom: 16 }]}>
                {isTel ? 'మీ జీవనశైలికి సరిపోయే వేగాన్ని ఎంచుకోండి:' : 'Select a pace that suits your lifestyle:'}
              </Text>

              {/* Dynamic Admin-Configured Bible Plans */}
              {(allAvailablePlans && allAvailablePlans.length > 0 ? allAvailablePlans : [
                { planId: '1-year-canonical', titleTelugu: '1 సంవత్సర సమగ్ర ప్రణాళిక', titleEnglish: '1-Year Complete Plan', durationDays: 365 },
                { planId: '2-year-canonical', titleTelugu: '2 సంవత్సరాల సులభమైన ప్రణాళిక', titleEnglish: '2-Year Relaxed Plan', durationDays: 730 }
              ]).map((p: any, pIdx: number) => (
                <TouchableOpacity
                  key={p.planId || pIdx}
                  style={[styles.planOptionCard, { borderColor: theme.cardBorder, marginTop: pIdx > 0 ? 10 : 0 }]}
                  onPress={async () => {
                    await setSelectedBiblePlan(p.planId);
                    await AsyncStorage.setItem('hasShownPlanPrompt', 'true');
                    setModalStep('success');
                  }}
                >
                  <MaterialCommunityIcons name="book-open-page-variant" size={26} color={pIdx % 2 === 0 ? theme.primary : theme.secondary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planOptionTitle, { color: theme.text }]}>
                      {isTel ? (p.titleTelugu || p.titleEnglish) : (p.titleEnglish || p.titleTelugu)}
                    </Text>
                    <Text style={[styles.planOptionSub, { color: theme.textSecondary }]}>
                      {isTel ? `${p.durationDays || 365} రోజులలో పఠన ప్రణాళికను పూర్తి చేయండి.` : `Complete reading portion in ${p.durationDays || 365} days.`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.modalBtnTextOnly, { marginTop: 16 }]}
                onPress={() => setModalStep('welcome')}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>
                  {isTel ? 'వెనుకకు వెళ్ళు' : 'Go Back'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {modalStep === 'alreadyRead' && (
            <View style={styles.modalStepContainer}>
              <View style={[styles.modalIconBg, { backgroundColor: theme.accentBackground }]}>
                <MaterialCommunityIcons name="trophy" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {isTel ? 'అద్భుతమైన విజయం! 🌟' : 'Amazing Accomplishment! 🌟'}
              </Text>
              <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                {isTel
                  ? "వావ్! మీరు ఇప్పటికే బైబిల్ మొత్తాన్ని చదివారు! ఇది చాలా గొప్ప ఆత్మీయ మైలురాయి."
                  : "Wow! You have already read the entire Bible! That is an incredible milestone."}
              </Text>
              <Text style={[styles.modalQuestionText, { color: theme.primary }]}>
                {isTel
                  ? "సరే, మీ జ్ఞానాన్ని పరీక్షించుకోవడానికి క్విజ్ ప్రారంభించడానికి లేదా మళ్ళీ చదవడానికి సిద్ధంగా ఉన్నారా? 😉"
                  : "Okay, are you dare to test your knowledge with a quiz, or challenge yourself to study it again? 😉"}
              </Text>

              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  await setSelectedBiblePlan('1-year-canonical');
                  await AsyncStorage.setItem('hasShownPlanPrompt', 'true');
                  setPlanModalVisible(false);
                  router.push('/bible');
                }}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {isTel ? 'మళ్ళీ క్విజ్ / అధ్యయనం చేద్దాం!' : "Let's Quiz / Study Again!"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: theme.textSecondary }]}
                onPress={async () => {
                  await AsyncStorage.setItem('hasShownPlanPrompt', 'true');
                  setPlanModalVisible(false);
                }}
              >
                <Text style={[styles.modalBtnTextSecondary, { color: theme.textSecondary }]}>
                  {isTel ? 'కేవలం చూస్తున్నాను' : 'Just Browsing'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {modalStep === 'success' && (
            <View style={styles.modalStepContainer}>
              <View style={[styles.modalIconBg, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="check-circle" size={40} color="#15803d" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {isTel ? 'ప్రణాళిక విజయవంతంగా ప్రారంభించబడింది!' : 'Plan Enrolled Successfully!'}
              </Text>
              <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                {isTel
                  ? "మంచి నిర్ణయం! మీ పఠన ప్రణాళిక ప్రారంభించబడింది. మీరు బైబిల్ విభాగంలో మీ రోజువారీ పఠనాన్ని మరియు క్విజ్‌లను అనుసరించవచ్చు."
                  : "Great choice! Your plan has been started. You can track your reading progress and take daily quizzes in the Bible section."}
              </Text>

              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: '#15803d' }]}
                onPress={() => {
                  setPlanModalVisible(false);
                  router.push('/bible');
                }}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {isTel ? 'బైబిల్ పఠనానికి వెళ్ళండి' : 'Go to Bible Reading'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnTextOnly, { marginTop: 12 }]}
                onPress={() => setPlanModalVisible(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>
                  {isTel ? 'హోమ్ స్క్రీన్‌లో ఉండండి' : 'Stay on Home Screen'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>

    {/* Admin Daily Promise Manager & Scheduler Modal */}
    <Modal
      visible={promiseModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={closePromiseManager}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, maxHeight: '85%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: theme.primary }}>
              {isTel ? '🌅 నేటి వాగ్దానం నిర్వహణ (Admin)' : '🌅 Daily Promise Manager'}
            </Text>
            <TouchableOpacity onPress={closePromiseManager}>
              <MaterialCommunityIcons name="close-circle" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Schedule Date Picker Selection */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textSecondary, marginTop: 4 }}>
              Schedule Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.primary,
                backgroundColor: theme.primary + '12',
                marginTop: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialCommunityIcons name="calendar-month" size={22} color={theme.primary} />
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>
                  {promiseDate}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={theme.primary} />
            </TouchableOpacity>

            {/* Native DateTimePicker popup when showDatePicker is true */}
            {showDatePicker && (
              <DateTimePicker
                value={new Date(promiseDate + 'T00:00:00')}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event: any, selectedDate?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setPromiseDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}

            {/* 2. Dropdown Selectors for Book, Chapter & Verse */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textSecondary, marginTop: 14 }}>
              Book, Chapter & Verse Selection *
            </Text>

            {/* Book Selector Dropdown Button */}
            <TouchableOpacity
              onPress={() => setBookModalOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 11,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                backgroundColor: theme.background,
                marginTop: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="book-open-page-variant" size={20} color={theme.primary} />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                  {selectedBook ? `${selectedBook.telugu} / ${selectedBook.english}` : 'Select Book'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Chapter & Verse Dropdowns Row */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {/* Chapter Dropdown Button */}
              <TouchableOpacity
                onPress={() => setChapterModalOpen(true)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.background,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="numeric" size={18} color={theme.primary} />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
                    Chapter: {selectedChapter || '1'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Verse Dropdown Button */}
              <TouchableOpacity
                onPress={() => setVerseModalOpen(true)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.background,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={18} color={theme.primary} />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
                    Verse: {selectedVerse || '1'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Reference Source of Truth Display */}
            <View style={{ marginVertical: 10, padding: 10, borderRadius: 10, backgroundColor: theme.primary + '10', borderWidth: 1, borderColor: theme.primary + '30' }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary }}>
                📖 Reference:
              </Text>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginTop: 2 }}>
                {refTel || 'కీర్తనలు 23:1'} ({refEng || 'Psalms 23:1'})
              </Text>
            </View>

            {/* 3. Telugu Verse Input Area */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textSecondary, marginTop: 4 }}>
              Telugu Verse *
            </Text>
            <TextInput
              value={promiseTel}
              onChangeText={setPromiseTel}
              placeholder="Telugu verse text..."
              placeholderTextColor="#757575"
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder, height: 75, textAlignVertical: 'top' }]}
            />

            {/* 4. English Verse Input Area */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textSecondary, marginTop: 8 }}>
              English Verse *
            </Text>
            <TextInput
              value={promiseEng}
              onChangeText={setPromiseEng}
              placeholder="English verse text..."
              placeholderTextColor="#757575"
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder, height: 75, textAlignVertical: 'top' }]}
            />

            <TouchableOpacity
              style={[styles.modalBtnPrimary, { backgroundColor: theme.primary, marginTop: 16 }]}
              onPress={handleSaveDailyPromise}
              disabled={savingPromise}
            >
              <Text style={styles.modalBtnTextPrimary}>
                {savingPromise ? 'Saving & Scheduling Promise...' : '💾 Save & Schedule Promise'}
              </Text>
            </TouchableOpacity>

            {/* Scheduled Promises List */}
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginTop: 20, marginBottom: 8 }}>
              🗓️ Scheduled Promises
            </Text>

            {scheduledPromisesList && scheduledPromisesList.length > 0 ? (
              scheduledPromisesList.map((item) => (
                <View key={item._id || item.date} style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 8, backgroundColor: theme.background }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary }}>
                      📅 {item.date}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity onPress={() => handleEditScheduledPromise(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.primary} />
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteScheduledPromise(item.date)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <MaterialCommunityIcons name="delete-outline" size={16} color="#ef4444" />
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ef4444' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 2 }}>
                    📖 {item.referenceTelugu} ({item.referenceEnglish})
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={2}>
                    "{item.verseTelugu}"
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', marginBottom: 10 }}>
                No future promises scheduled yet.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* ── Book Dropdown Selection Modal ── */}
    <Modal visible={bookModalOpen} transparent animationType="slide" onRequestClose={() => setBookModalOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: theme.backgroundElement, borderRadius: 16, padding: 16, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>📖 Select Bible Book</Text>
            <TouchableOpacity onPress={() => setBookModalOpen(false)}>
              <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder="Search book... (e.g. కీర్తనలు / Psalms)"
            placeholderTextColor="#757575"
            value={bookSearchText}
            onChangeText={setBookSearchText}
            style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder, marginBottom: 10 }]}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            {allBibleBooks.filter(b => b.telugu.includes(bookSearchText) || b.english.toLowerCase().includes(bookSearchText.toLowerCase())).map((b) => (
              <TouchableOpacity
                key={b.english}
                onPress={() => handleBookSelect(b)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.cardBorder,
                  backgroundColor: selectedBook?.english === b.english ? theme.primary + '20' : 'transparent',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: selectedBook?.english === b.english ? theme.primary : theme.text }}>
                  {b.telugu}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>{b.english}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* ── Chapter Dropdown Selection Modal ── */}
    <Modal visible={chapterModalOpen} transparent animationType="slide" onRequestClose={() => setChapterModalOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: theme.backgroundElement, borderRadius: 16, padding: 16, maxHeight: '75%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>🔢 Select Chapter ({selectedBook?.telugu} / {selectedBook?.english})</Text>
            <TouchableOpacity onPress={() => setChapterModalOpen(false)}>
              <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {availableChapters.map((ch) => (
                <TouchableOpacity
                  key={ch}
                  onPress={() => handleChapterSelect(ch)}
                  style={{
                    width: 52,
                    height: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: Number(selectedChapter) === ch ? theme.primary : theme.cardBorder,
                    backgroundColor: Number(selectedChapter) === ch ? theme.primary : theme.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: Number(selectedChapter) === ch ? '#ffffff' : theme.text }}>
                    {ch}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* ── Verse Selection Modal ── */}
    <Modal visible={verseModalOpen} transparent animationType="slide" onRequestClose={() => setVerseModalOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: theme.backgroundElement, borderRadius: 16, padding: 16, maxHeight: '75%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>📜 Select Verse ({selectedBook?.telugu} {selectedChapter})</Text>
            <TouchableOpacity onPress={() => setVerseModalOpen(false)}>
              <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {availableVerses.map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => handleVerseSelect(v)}
                  style={{
                    width: 52,
                    height: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: Number(selectedVerse) === v ? theme.primary : theme.cardBorder,
                    backgroundColor: Number(selectedVerse) === v ? theme.primary : theme.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: Number(selectedVerse) === v ? '#ffffff' : theme.text }}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14,
    marginTop: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 1,
    paddingTop: 10,
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  usernameText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  headerBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  liveContainer: {
    borderRadius: 16,
    padding: 16,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  liveTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  liveSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
  },
  verseCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  verseDecorationLeft: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  verseDecorationRight: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  verseText: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  verseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  verseFooterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  shareIconBtn: {
    padding: 4,
  },
  planCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planDayText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  streakText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#e65100',
  },
  datesBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  portionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  portionSummary: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 6,
    overflow: 'hidden',
  },
  planBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  lockedTomorrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllBtn: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  eventCalendarBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventCalendarDay: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventCalendarMonth: {
    fontSize: 9,
    fontWeight: '700',
  },
  eventInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 11,
  },
  eventSpeaker: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  noticeCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  noticeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    flex: 1,
  },
  noticeDate: {
    fontSize: 10.5,
    marginLeft: 8,
  },
  noticeDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  emptyContainer: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalStepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  modalBtnPrimary: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalBtnTextPrimary: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBtnSecondary: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextSecondary: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBtnTextOnly: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  planOptionCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  planOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  planOptionSub: {
    fontSize: 11,
    lineHeight: 14,
  },
});
