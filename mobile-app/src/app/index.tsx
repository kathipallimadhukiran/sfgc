import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, ScrollView, View, Platform, Share, TouchableOpacity, Image, Modal, RefreshControl, FlatList, Dimensions, Linking, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Title, Paragraph, Button, Avatar, Text, ActivityIndicator } from 'react-native-paper';
import { useApp } from '@/context/AppContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import { biblePlanService, UserProgressData, DailyPromiseData } from '@/services/biblePlanService';
import { DailyPortion } from '@/constants/defaultBiblePlans';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import { liveVideosService } from '@/services/liveVideosService';

/* Videos are loaded from the MongoDB-backed live video service.
[
  {
    id: 'q72x53zRk_k',
    titleTel: 'ఆదివారపు ఆరాధన - దేవుని వాక్య ధ్యానము | Sunday Worship Service',
    titleEng: 'Sunday Worship Service - Holy Sermon & Message',
    type: 'video',
    duration: '1:42:30',
    thumbnail: 'https://img.youtube.com/vi/q72x53zRk_k/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=q72x53zRk_k'
  },
  {
    id: 'M7lc1UVf-VE',
    titleTel: 'నేటి దేవుని వాగ్దానం #Shorts | Daily Promise Short',
    titleEng: 'Daily God\'s Promise - Today\'s Verse #Shorts',
    type: 'short',
    duration: '0:45',
    thumbnail: 'https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg',
    url: 'https://youtube.com/shorts/M7lc1UVf-VE'
  },
  {
    id: 'hTj4e9v66_0',
    titleTel: 'యేసుక్రీస్తు జననము - క్రిస్మస్ సందేశము | Special Christmas Message',
    titleEng: 'The Birth of Jesus - Special Christmas Sermon',
    type: 'video',
    duration: '58:15',
    thumbnail: 'https://img.youtube.com/vi/hTj4e9v66_0/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=hTj4e9v66_0'
  },
  {
    id: '2g812Gy1bNg',
    titleTel: 'యేసు నా నామమున అద్భుతము #Shorts | Miracle in Jesus Name',
    titleEng: 'Miracles in the Name of Jesus #Shorts',
    type: 'short',
    duration: '0:55',
    thumbnail: 'https://img.youtube.com/vi/2g812Gy1bNg/hqdefault.jpg',
    url: 'https://youtube.com/shorts/2g812Gy1bNg'
  },
  {
    id: 'Xg94b7fP2_o',
    titleTel: 'ఉపవాస ప్రార్థన కూడిక | Friday Fasting Prayer Live',
    titleEng: 'Friday Fasting Prayer Live Broadcast',
    type: 'video',
    duration: '2:15:00',
    thumbnail: 'https://img.youtube.com/vi/Xg94b7fP2_o/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=Xg94b7fP2_o'
  },
  {
    id: '3S9v_Z-c69s',
    titleTel: 'క్రీస్తులో నూతన సృష్టి #Shorts | New Creation in Christ',
    titleEng: 'A New Creation in Christ #Shorts',
    type: 'short',
    duration: '0:38',
    thumbnail: 'https://img.youtube.com/vi/3S9v_Z-c69s/hqdefault.jpg',
    url: 'https://youtube.com/shorts/3S9v_Z-c69s'
  },
  {
    id: 'J2aO52tO9g0',
    titleTel: 'యూత్ స్పెషల్ మీటింగ్ | Youth Awakening Conference 2025',
    titleEng: 'Youth Awakening Conference 2025 - Special Meetup',
    type: 'video',
    duration: '1:12:45',
    thumbnail: 'https://img.youtube.com/vi/J2aO52tO9g0/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=J2aO52tO9g0'
  },
  {
    id: 'l31oP8M9F6k',
    titleTel: 'ప్రార్థన యొక్క శక్తి #Shorts | Power of Prayer Short',
    titleEng: 'The Power of Personal Prayer #Shorts',
    type: 'short',
    duration: '0:50',
    thumbnail: 'https://img.youtube.com/vi/l31oP8M9F6k/hqdefault.jpg',
    url: 'https://youtube.com/shorts/l31oP8M9F6k'
  },
  {
    id: 'J_b0gT8M9F0',
    titleTel: 'ప్రత్యేక గాయక బృందం గీతం | Special Choir Presentation 2026',
    titleEng: 'Special Choir Presentation 2026 - Sanctuary Worship',
    type: 'video',
    duration: '8:40',
    thumbnail: 'https://img.youtube.com/vi/J_b0gT8M9F0/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=J_b0gT8M9F0'
  },
  {
    id: '4yV-W_c31f4',
    titleTel: 'విశ్వాసము యొక్క విలువ #Shorts | Value of Faith Short',
    titleEng: 'The Value of Genuine Faith #Shorts',
    type: 'short',
    duration: '0:42',
    thumbnail: 'https://img.youtube.com/vi/4yV-W_c31f4/hqdefault.jpg',
    url: 'https://youtube.com/shorts/4yV-W_c31f4'
  }
];
*/

interface HomeVideo {
  id: string;
  titleTel: string;
  titleEng: string;
  type: 'video';
  duration: string;
  thumbnail: string;
  url: string;
}

export default function HomeScreen() {
  const { user, dailyVerse, events, notices, liveSession, joinLiveSession, leaveLiveSession, language, bibleLanguage, t, selectedBiblePlan, setSelectedBiblePlan } = useApp();
  const router = useRouter();
  const theme = useTheme();
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
        setRecentVideos(result.videos.map(video => ({
          id: video._id,
          titleTel: video.title,
          titleEng: video.title,
          type: 'video',
          duration: '--:--',
          thumbnail: video.thumbnail,
          url: video.youtubeUrl,
        })));
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
    loadPlanAndStreak();
    loadDailyPromise();
    return () => leaveLiveSession();
  }, [language, bibleLanguage, selectedBiblePlan]);

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
          <TouchableOpacity onPress={handleShareVerse} style={styles.shareIconBtn}>
            <MaterialCommunityIcons name="share-variant" size={18} color={theme.primary} />
          </TouchableOpacity>
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
            getItemLayout={(data, index) => ({
              length: Dimensions.get('window').width - 32,
              offset: (Dimensions.get('window').width - 32) * index,
              index,
            })}
            onMomentumScrollEnd={handleVideoScroll}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => Linking.openURL(item.url)}
                style={{ width: Dimensions.get('window').width - 32, height: 180, position: 'relative' }}
              >
                {/* Thumbnail Image */}
                <Image
                  source={{ uri: item.thumbnail }}
                  style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                />

                {/* Overlay Play Icon */}
                <View style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -25 }, { translateY: -25 }], width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="play" size={32} color="#ffffff" style={{ marginLeft: 2 }} />
                </View>

                {/* Type Badge (Video / Shorts) */}
                <View style={{ position: 'absolute', top: 12, right: 12, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: item.type === 'short' ? '#ff0000' : 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons 
                    name={item.type === 'short' ? 'flash' : 'video'} 
                    size={12} 
                    color="#ffffff" 
                  />
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff' }}>
                    {item.type === 'short' ? 'SHORTS' : item.duration}
                  </Text>
                </View>

                {/* Bottom Title Bar */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 10, paddingHorizontal: 12 }}>
                  <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700' }} numberOfLines={1}>
                    {isTel ? item.titleTel : item.titleEng}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
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
                        ? (isTel ? '🎉 అద్భుతం! నేటి పఠనం & క్విజ్ పూర్తయింది. రేపటి దినము రేపు ఉదయం అన్‌లాక్ అవుతుంది!' : '🎉 Great job! Today\'s reading & quiz completed. Tomorrow\'s portion unlocks tomorrow!')
                        : (hasCompletedQuizToday()
                            ? (isTel ? '📖 నేటి పఠనం చదవడానికి సిద్ధంగా ఉంది. క్విజ్ రేపు అన్‌లాక్ అవుతుంది!' : '📖 Today\'s portion is ready for reading. The quiz will unlock tomorrow!')
                            : (isTel ? '👉 వాక్యం చదవడానికి "వాక్యం చదవండి" అని నొక్కండి. చదివిన తర్వాత క్రింద "చదివాను" అని గుర్తించి క్విజ్ రాయండి.' : '👉 Tap "Go to Read" to read today\'s chapters in Bible, then mark as read to take quiz.'))}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action: Go to Read Button / Locked Tomorrow Status */}
              {isTodayCompleted ? (
                <View style={[styles.lockedTomorrowBanner, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                  <MaterialCommunityIcons name="lock-clock" size={18} color="#16a34a" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a', flex: 1 }}>
                    {isTel ? `🔒 దినము ${todayPortion.day + 1} రేపు ఉదయం 12:00 AMకు అన్‌లాక్ అవుతుంది` : `🔒 Next day unlocks tomorrow at 12:00 AM`}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/bible', params: { autoOpenChapter: todayPortion.startChapter, autoOpenBook: todayPortion.book } })}
                  style={[styles.planBtn, { backgroundColor: theme.primary }]}
                >
                  <MaterialCommunityIcons name="book-open-page-variant" size={18} color="#ffffff" />
                  <Text style={styles.planBtnText}>
                    {isTel ? 'వాక్యం చదవండి (Go to Read)' : 'Go to Read Chapters'}
                  </Text>
                </TouchableOpacity>
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

              {/* Option 1 Year */}
              <TouchableOpacity
                style={[styles.planOptionCard, { borderColor: theme.cardBorder }]}
                onPress={async () => {
                  await setSelectedBiblePlan('1-year-canonical');
                  await AsyncStorage.setItem('hasShownPlanPrompt', 'true');
                  setModalStep('success');
                }}
              >
                <MaterialCommunityIcons name="numeric-1-circle" size={28} color={theme.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planOptionTitle, { color: theme.text }]}>
                    {isTel ? '1 సంవత్సర సమగ్ర ప్రణాళిక' : '1-Year Complete Plan'}
                  </Text>
                  <Text style={[styles.planOptionSub, { color: theme.textSecondary }]}>
                    {isTel ? '365 రోజులలో బైబిల్ అంతా పూర్తి చేయండి.' : 'Complete the entire Bible in 365 days.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2 Year */}
              <TouchableOpacity
                style={[styles.planOptionCard, { borderColor: theme.cardBorder, marginTop: 10 }]}
                onPress={async () => {
                  await setSelectedBiblePlan('2-year-canonical');
                  await AsyncStorage.setItem('hasShownPlanPrompt', 'true');
                  setModalStep('success');
                }}
              >
                <MaterialCommunityIcons name="numeric-2-circle" size={28} color={theme.secondary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planOptionTitle, { color: theme.text }]}>
                    {isTel ? '2 సంవత్సరాల సులభమైన ప్రణాళిక' : '2-Year Relaxed Plan'}
                  </Text>
                  <Text style={[styles.planOptionSub, { color: theme.textSecondary }]}>
                    {isTel ? 'రోజుకు 1-2 అధ్యాయాలు చదువుతూ ముగించండి.' : 'Read 1-2 chapters daily at a relaxed pace.'}
                  </Text>
                </View>
              </TouchableOpacity>

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
  </>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 14,
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    borderRadius: 10,
    gap: 8,
  },
  planBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
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
