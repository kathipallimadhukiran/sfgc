import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput as RNTextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
  Alert,
  Share,
  Linking,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Text, Portal, Modal, Button, Divider } from 'react-native-paper';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { liveVideosService } from '@/services/liveVideosService';
import { useRouter } from 'expo-router';

// ─── Default Categories ────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'sunday',  labelEng: 'Sunday Worship',      labelTel: 'ఆదివారపు ఆరాధనలు',       icon: 'church' },
  { id: 'fasting', labelEng: 'Fasting & Prayer',    labelTel: 'ఉపవాస కూడికలు',           icon: 'hands-pray' },
  { id: 'youth',   labelEng: 'Youth Meetings',      labelTel: 'యూత్ కూడికలు',             icon: 'account-group' },
  { id: 'sermon',  labelEng: 'Sermons',             labelTel: 'ప్రసంగాలు',                icon: 'microphone' },
  { id: 'special', labelEng: 'Special Services',    labelTel: 'ప్రత్యేక కార్యక్రమాలు',  icon: 'star' },
];

// ─── Default Videos ────────────────────────────────────────────────────────────
/* Video records are loaded from MongoDB.
[
  {
    id: 'q72x53zRk_k',
    titleTel: 'ఆదివారపు ఆరాధన - దేవుని వాక్య ధ్యానము | Sunday Worship Service',
    titleEng: 'Sunday Worship Service - Holy Sermon & Message',
    duration: '1:42:30',
    viewsTel: '1.2వేల వీక్షణలు',
    viewsEng: '1.2K views',
    publishedTel: '2 రోజుల క్రితం',
    publishedEng: '2 days ago',
    thumbnail: 'https://img.youtube.com/vi/q72x53zRk_k/hqdefault.jpg',
    categoryId: 'sunday',
  },
  {
    id: 'hTj4e9v66_0',
    titleTel: 'యేసుక్రీస్తు జననము - క్రిస్మస్ సందేశము | Special Christmas Message',
    titleEng: 'The Birth of Jesus - Special Christmas Sermon',
    duration: '58:15',
    viewsTel: '840 వీక్షణలు',
    viewsEng: '840 views',
    publishedTel: '1 వారం క్రితం',
    publishedEng: '1 week ago',
    thumbnail: 'https://img.youtube.com/vi/hTj4e9v66_0/hqdefault.jpg',
    categoryId: 'special',
  },
  {
    id: 'Xg94b7fP2_o',
    titleTel: 'ఉపవాస ప్రార్థన కూడిక | Friday Fasting Prayer Live',
    titleEng: 'Friday Fasting Prayer Live Broadcast',
    duration: '2:15:00',
    viewsTel: '2.5వేల వీక్షణలు',
    viewsEng: '2.5K views',
    publishedTel: '3 వారాల క్రితం',
    publishedEng: '3 weeks ago',
    thumbnail: 'https://img.youtube.com/vi/Xg94b7fP2_o/hqdefault.jpg',
    categoryId: 'fasting',
  },
  {
    id: 'J2aO52tO9g0',
    titleTel: 'యూత్ స్పెషల్ మీటింగ్ | Youth Awakening Conference 2025',
    titleEng: 'Youth Awakening Conference 2025 - Special Meetup',
    duration: '1:12:45',
    viewsTel: '450 వీక్షణలు',
    viewsEng: '450 views',
    publishedTel: '1 నెల క్రితం',
    publishedEng: '1 month ago',
    thumbnail: 'https://img.youtube.com/vi/J2aO52tO9g0/hqdefault.jpg',
    categoryId: 'youth',
  },
];
*/

// ─── Helpers ───────────────────────────────────────────────────────────────────
const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const youtubeUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

const openInYouTube = async (videoId: string) => {
  const appUrl  = `vnd.youtube://${videoId}`;
  const webUrl  = youtubeUrl(videoId);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
};

const shareVideo = async (videoId: string, title: string) => {
  try {
    await Share.share({
      message: `${title}\n${youtubeUrl(videoId)}`,
      url: youtubeUrl(videoId),
      title,
    });
  } catch (_) {}
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface VideoItem {
  dbId?: string;
  id: string;
  titleEng: string;
  titleTel: string;
  duration: string;
  viewsEng: string;
  viewsTel: string;
  publishedEng: string;
  publishedTel: string;
  thumbnail: string;
  categoryId: string;
  createdAt?: string;
}

interface Category {
  id: string;
  labelEng: string;
  labelTel: string;
  icon: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function LiveStreamScreen() {
  const { liveSession, language, user, updateLiveYoutubeLink, joinLiveSession, notices, refreshData } = useApp();
  const theme = useTheme();
  const router = useRouter();

  const isTel = language === 'Telugu';
  const isAdmin = user && ['Admin', 'Super Admin'].includes(user.role);
  const canEditStream = user && ['Admin', 'Super Admin', 'Media Team', 'Worship Leader'].includes(user.role);

  // Auto-join socket session when screen is opened
  useEffect(() => {
    joinLiveSession();
  }, []);

  // ── State ────────────────────────────────────────────────────────────────────
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [videoSearch, setVideoSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Edit Stream modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [savingStream, setSavingStream] = useState(false);

  // Add Video modal
  const [addVideoModalVisible, setAddVideoModalVisible] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoCategoryId, setNewVideoCategoryId] = useState('sunday');
  const [addVideoPreviewId, setAddVideoPreviewId] = useState<string | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);

  const loadVideos = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const result = await liveVideosService.getVideos();
      if (!result.success) {
        setFetchError(true);
        return;
      }

      const rawList = result.videos || [];
      const sorted = [...rawList].sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA; // Newest video FIRST
      });

      setVideos(sorted.map(video => ({
        dbId: video._id,
        id: video.youtubeId,
        titleEng: video.title,
        titleTel: video.title,
        duration: '--:--',
        viewsEng: 'Recently added',
        viewsTel: 'ఇప్పుడే జోడించారు',
        publishedEng: (video.publishedAt || video.createdAt) ? new Date(video.publishedAt || video.createdAt!).toLocaleDateString() : 'Recently added',
        publishedTel: (video.publishedAt || video.createdAt) ? new Date(video.publishedAt || video.createdAt!).toLocaleDateString('te-IN') : 'ఇప్పుడే జోడించారు',
        thumbnail: video.thumbnail,
        categoryId: video.categoryId,
        createdAt: video.createdAt,
      })));
    } catch (err) {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filteredVideos = videos.filter(video => {
    const matchesCategory =
      selectedCategoryFilter === 'all' || video.categoryId === selectedCategoryFilter;

    const query = videoSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      video.titleEng.toLowerCase().includes(query) ||
      video.titleTel.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  // Live video ID from socket session (if active)
  const liveVideoId = liveSession?.activeYoutubeLink
    ? extractYoutubeId(liveSession.activeYoutubeLink)
    : liveSession?.song?.youtubeLink
    ? extractYoutubeId(liveSession.song.youtubeLink)
    : null;

  // ── Theme helpers ─────────────────────────────────────────────────────────────
  const isDark = theme.background === '#09090b';
  const cardBg = isDark ? '#1f1f1f' : theme.backgroundElement;
  const subtleText = isDark ? '#aaaaaa' : theme.textSecondary;
  const dividerColor = isDark ? '#2f2f2f' : theme.cardBorder;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleUpdateLink = async () => {
    if (!streamUrl.trim()) {
      Alert.alert('', isTel ? 'దయచేసి యూట్యూబ్ వీడియో లింక్‌ను నమోదు చేయండి.' : 'Please enter a YouTube video URL.');
      return;
    }
    setSavingStream(true);
    try {
      await updateLiveYoutubeLink(streamUrl.trim());
      Alert.alert('', isTel ? '🎉 లైవ్ స్ట్రీమ్ లింక్ విజయవంతంగా అప్‌డేట్ చేయబడింది!' : '🎉 Live Stream link updated successfully!');
      setEditModalVisible(false);
      setStreamUrl('');
    } catch (err) {
      console.log('Update stream url error:', err);
    } finally {
      setSavingStream(false);
    }
  };

  const handleUrlPreview = (url: string) => {
    setNewVideoUrl(url);
    const extracted = extractYoutubeId(url.trim());
    setAddVideoPreviewId(extracted);
  };

  const handleDeleteVideo = (videoId: string, title: string) => {
    if (!isAdmin) return;

    Alert.alert(
      isTel ? 'ఈ వీడియోను తొలగించాలా?' : 'Delete this video?',
      isTel ? `“${title}” వీడియో తొలగించబడుతుంది.` : `“${title}” will be removed.`,
      [
        { text: isTel ? 'రద్దు చేయి' : 'Cancel', style: 'cancel' },
        {
          text: isTel ? 'తొలగించు' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await liveVideosService.deleteVideo(videoId);
            if (!result.success) {
              Alert.alert('', result.message || 'Unable to delete video.');
              return;
            }
            setVideos(prev => prev.filter(video => video.dbId !== videoId));
            refreshData();
          },
        },
      ],
    );
  };

  const handleSaveVideo = async () => {
    const vid = extractYoutubeId(newVideoUrl);
    if (!vid) {
      Alert.alert('', isTel ? 'సరైన యూట్యూబ్ లింక్‌ను నమోదు చేయండి.' : 'Please enter a valid YouTube URL.');
      return;
    }
    if (!newVideoTitle.trim()) {
      Alert.alert('', isTel ? 'వీడియో శీర్షికను నమోదు చేయండి.' : 'Please enter a video title.');
      return;
    }

    setSavingVideo(true);
    try {
      const result = await liveVideosService.addVideo({
        youtubeUrl: newVideoUrl.trim(),
        title: newVideoTitle.trim(),
        categoryId: newVideoCategoryId,
      });

      if (!result.success || !result.video) {
        Alert.alert('', result.message || (isTel ? 'వీడియోను సేవ్ చేయలేకపోయాము.' : 'Unable to save video.'));
        return;
      }

      const newVideo: VideoItem = {
        dbId: result.video._id,
        id: result.video.youtubeId,
        titleEng: result.video.title,
        titleTel: result.video.title,
        duration: '--:--',
        viewsEng: 'Just added',
        viewsTel: 'ఇప్పుడే జోడించారు',
        publishedEng: 'Today',
        publishedTel: 'నేడు',
        thumbnail: result.video.thumbnail,
        categoryId: result.video.categoryId,
        createdAt: result.video.createdAt,
      };

      // 1. Immediately add to list
      setVideos(prev => [newVideo, ...prev]);

      // 2. Refresh app data (updates notification count & list)
      refreshData();

      // 3. Reset form and close modal
      setAddVideoModalVisible(false);
      setNewVideoUrl('');
      setNewVideoTitle('');
      setAddVideoPreviewId(null);
      setNewVideoCategoryId('sunday');

      // 4. Show success toast message
      Alert.alert('✅', isTel ? 'వీడియో విజయవంతంగా జోడించబడింది' : 'YouTube video added successfully');
    } catch (err: any) {
      Alert.alert('', err?.message || 'Error saving video');
    } finally {
      setSavingVideo(false);
    }
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <Portal.Host>
      <View style={[styles.container, { backgroundColor: theme.background }]}>

        

        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadVideos}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >

          {/* ── Top Header Section ──────────────────────────────────────────────── */}
          <View style={styles.topSectionContainer}>
            <Text style={[styles.topTitle, { color: theme.text, textAlign: 'center' }]}>
              {isTel ? 'యూట్యూబ్ వీడియోలు' : 'YouTube Videos'}
            </Text>

            {/* Subscribe to Channel Card */}
            <View style={[styles.subscribeCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={styles.ytRedBadge}>
                  <MaterialCommunityIcons name="youtube" size={22} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subscribeTitle, { color: theme.text }]}>YouTube</Text>
                  <Text style={[styles.subscribeSub, { color: subtleText }]}>
                    {isTel ? 'మా యూట్యూబ్ ఛానెల్‌ని సబ్‌స్క్రైబ్ చేయండి' : 'Subscribe to our YouTube channel'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.subscribeBtn}
                onPress={async () => {
                  const channelHandle = 'https://www.youtube.com/@SFGCChurch';
                  const searchQuery = 'https://www.youtube.com/results?search_query=SFGC+Church';
                  try {
                    await Linking.openURL(channelHandle);
                  } catch (e) {
                    await Linking.openURL(searchQuery);
                  }
                }}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons name="youtube" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.subscribeBtnText}>
                  {isTel ? 'సబ్‌స్క్రైబ్ చేయండి' : 'Subscribe'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rounded Search Bar */}
            <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: dividerColor, marginTop: 12 }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={subtleText} />
              <RNTextInput
                value={videoSearch}
                onChangeText={setVideoSearch}
                placeholder={isTel ? 'వీడియోలను వెతకండి...' : 'Search videos...'}
                placeholderTextColor={subtleText}
                style={[styles.searchInput, { color: theme.text }]}
                returnKeyType="search"
              />
              {videoSearch.length > 0 && (
                <TouchableOpacity onPress={() => setVideoSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={subtleText} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Top Featured Live Stream / Video Card ────────────────────── */}
          {liveVideoId && (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => openInYouTube(liveVideoId)}
              style={[styles.liveBannerWrapper, { marginHorizontal: 16, marginTop: 4, marginBottom: 16 }]}
            >
              <Image
                source={{ uri: `https://img.youtube.com/vi/${liveVideoId}/hqdefault.jpg` }}
                style={styles.liveBannerThumb}
                resizeMode="cover"
              />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={styles.liveBannerGradient}>
                <View style={[styles.livePill, { backgroundColor: '#dc2626' }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.livePillText}>{isTel ? '🔴 సజీవ ప్రసారం (LIVE NOW)' : '🔴 LIVE STREAMING NOW'}</Text>
                </View>
                <Text style={styles.liveBannerTitle} numberOfLines={2}>
                  {liveSession?.song?.title || (videos[0] ? (isTel ? videos[0].titleTel : videos[0].titleEng) : (isTel ? 'చర్చి సజీవ ఆరాధన ప్రసారం' : 'Sanctuary Live Worship Service'))}
                </Text>
                <View style={styles.watchNowBtn}>
                  <MaterialCommunityIcons name="youtube" size={18} color="#fff" />
                  <Text style={styles.watchNowText}>{isTel ? 'యూట్యూబ్‌లో ప్రత్యక్షంగా చూడండి' : 'Watch Live on YouTube'}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── Section Header ───────────────────────────────────────────────── */}
          <View style={styles.recentHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {isTel ? 'ఇటీవల వీడియోలు' : 'Recent Videos'}
              </Text>
            </View>
            <View style={[styles.videoCountBadge, { backgroundColor: theme.accentBackground }]}>
              <MaterialCommunityIcons name="youtube" size={15} color={theme.primary} />
              <Text style={[styles.videoCountText, { color: theme.primary }]}>
                {filteredVideos.length}
              </Text>
            </View>
          </View>

          {/* ── Skeleton Loading State ───────────────────────────────────────── */}
          {loading ? (
            <View style={styles.skeletonContainer}>
              {[1, 2, 3].map(item => (
                <View key={item} style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
                  <View style={[styles.skeletonThumb, { backgroundColor: dividerColor }]} />
                  <View style={{ padding: 14, gap: 10 }}>
                    <View style={[styles.skeletonLine, { width: '80%', height: 16, backgroundColor: dividerColor }]} />
                    <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: dividerColor }]} />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <View style={[styles.skeletonLine, { width: 90, height: 32, borderRadius: 8, backgroundColor: dividerColor }]} />
                      <View style={[styles.skeletonLine, { width: 90, height: 32, borderRadius: 8, backgroundColor: dividerColor }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : fetchError ? (
            /* ── Error State ─────────────────────────────────────────────────── */
            <View style={[styles.errorBox, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={44} color="#ef4444" style={{ marginBottom: 10 }} />
              <Text style={[styles.errorTitle, { color: theme.text }]}>
                {isTel ? 'వీడియోలను లోడ్ చేయలేకపోయాము' : 'Unable to load videos'}
              </Text>
              <Button
                mode="contained"
                buttonColor={theme.primary}
                textColor="#ffffff"
                style={{ marginTop: 14, borderRadius: 10 }}
                onPress={loadVideos}
              >
                {isTel ? 'మళ్లీ ప్రయత్నించండి' : 'Retry'}
              </Button>
            </View>
          ) : filteredVideos.length === 0 ? (
            /* ── Empty State ─────────────────────────────────────────────────── */
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <MaterialCommunityIcons name="video-off-outline" size={46} color={subtleText} style={{ opacity: 0.6, marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {isTel ? 'వీడియోలు ఇంకా లేవు' : 'No videos available yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: subtleText }]}>
                {isTel ? 'కొత్త YouTube వీడియోలను ఇక్కడ చూడవచ్చు.' : 'Check back later for new YouTube worship videos.'}
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.primaryAddBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
                  onPress={() => setAddVideoModalVisible(true)}
                  activeOpacity={0.88}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
                  <Text style={styles.primaryAddBtnText}>
                    {isTel ? '+ YouTube వీడియో' : '+ Add Video'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* ── Recent Video Cards List (Matching User Mock Exactly) ───────────────── */
            filteredVideos.map((item, idx) => {
              const title = isTel ? item.titleTel : item.titleEng;
              const dateStr = item.createdAt 
                ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '16 Aug 2026';

              return (
                <View key={item.id || idx} style={[styles.videoCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
                  
                  {/* Thumbnail Box with Duration Badge in Bottom-Right Corner */}
                  <TouchableOpacity activeOpacity={0.92} onPress={() => openInYouTube(item.id)} style={styles.thumbnailBox}>
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} resizeMode="cover" />
                    <View style={styles.thumbnailShade} />

                    {/* Duration Badge Bottom-Right Corner */}
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{item.duration && item.duration !== '--:--' ? item.duration : 'LIVE'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Video Details */}
                  <View style={styles.videoInfo}>
                    
                    {/* Title */}
                    <TouchableOpacity activeOpacity={0.8} onPress={() => openInYouTube(item.id)}>
                      <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                        {title}
                      </Text>
                    </TouchableOpacity>

                    {/* Publishing Date */}
                    <Text style={[styles.videoDateText, { color: subtleText }]}>
                      {dateStr}
                    </Text>

                    {/* Action Bar: [ ↗ Share ] and [ ▶ Watch ] */}
                    <View style={styles.videoActionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtnOutline, { borderColor: theme.cardBorder }]}
                        onPress={() => shareVideo(item.id, title)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="export-variant" size={15} color={theme.text} />
                        <Text style={[styles.actionBtnOutlineText, { color: theme.text }]}>
                          {isTel ? 'షేర్' : 'Share'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtnFilled, { backgroundColor: '#ef4444' }]}
                        onPress={() => openInYouTube(item.id)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="play" size={16} color="#ffffff" />
                        <Text style={styles.actionBtnFilledText}>
                          {isTel ? 'చూడండి' : 'Watch'}
                        </Text>
                      </TouchableOpacity>

                      {isAdmin && (
                        <TouchableOpacity
                          style={[styles.actionDeleteBtn, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}
                          onPress={() => item.dbId && handleDeleteVideo(item.dbId, title)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={17} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}

        </ScrollView>

        {/* ── Floating Action Button (FAB) in Bottom Right Corner for Admins ── */}
        {isAdmin && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              zIndex: 999,
            }}
            onPress={() => setAddVideoModalVisible(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={28} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* MODAL 1 — Edit Live Stream URL                                        */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <Portal>
          <Modal
            visible={editModalVisible}
            onDismiss={() => setEditModalVisible(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={styles.modalHeader}>
              <LinearGradient colors={['#6366f1', '#ec4899']} style={styles.modalIconBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialCommunityIcons name="broadcast" size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {isTel ? 'లైవ్ స్ట్రీమ్ సెట్ చేయండి' : 'Set Live Stream'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {isTel ? 'సభ్యులందరూ ఈ లింక్ చూస్తారు' : 'All church members will see this stream'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Divider style={{ backgroundColor: theme.cardBorder, marginVertical: 14 }} />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              {isTel ? 'యూట్యూబ్ స్ట్రీమ్ లింక్' : 'YouTube Stream URL'}
            </Text>
            <RNTextInput
              value={streamUrl}
              onChangeText={setStreamUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.textInput, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder, color: theme.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" style={{ flex: 1 }} textColor={theme.textSecondary} onPress={() => setEditModalVisible(false)} disabled={savingStream}>
                {isTel ? 'రద్దు' : 'Cancel'}
              </Button>
              <Button mode="contained" buttonColor="#ff0000" textColor="#fff" style={{ flex: 1, marginLeft: 10 }} onPress={handleUpdateLink} loading={savingStream} disabled={savingStream}>
                {isTel ? 'గో లైవ్' : 'Go Live'}
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* MODAL 2 — Add YouTube Video (Admin Only)                              */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <Portal>
          <Modal
            visible={addVideoModalVisible}
            onDismiss={() => setAddVideoModalVisible(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.backgroundElement }]}
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <View style={styles.modalHeader}>
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.modalIconBadge}>
                  <MaterialCommunityIcons name="youtube" size={22} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {isTel ? 'కొత్త YouTube వీడియో' : 'New YouTube Video'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    {isTel ? 'యూట్యూబ్ లింక్ పేస్ట్ చేసి వీడియోను జోడించండి' : 'Paste YouTube link to add a video'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAddVideoModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Divider style={{ backgroundColor: theme.cardBorder, marginVertical: 14 }} />

              {/* YouTube URL */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {isTel ? 'YouTube URL *' : 'YouTube URL *'}
              </Text>
              <RNTextInput
                value={newVideoUrl}
                onChangeText={handleUrlPreview}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.textInput, { backgroundColor: theme.backgroundSelected, borderColor: addVideoPreviewId ? theme.primary : theme.cardBorder, color: theme.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Live Preview Card */}
              {addVideoPreviewId ? (
                <View style={[styles.previewCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.primary }]}>
                  <Image source={{ uri: `https://img.youtube.com/vi/${addVideoPreviewId}/hqdefault.jpg` }} style={styles.previewThumb} resizeMode="cover" />
                  <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
                    <View style={styles.validBadge}>
                      <MaterialCommunityIcons name="check-circle" size={13} color="#16a34a" />
                      <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '800', marginLeft: 4 }}>
                        {isTel ? 'చెల్లుబాటు అయ్యే YouTube లింక్' : 'Valid YouTube Link'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>ID: {addVideoPreviewId}</Text>
                  </View>
                </View>
              ) : null}

              {/* Video Title */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                {isTel ? 'వీడియో శీర్షిక *' : 'Video Title *'}
              </Text>
              <RNTextInput
                value={newVideoTitle}
                onChangeText={setNewVideoTitle}
                placeholder={isTel ? 'ఆదివారపు ఆరాధన సందేశము' : 'Sunday Worship Sermon'}
                placeholderTextColor={theme.textSecondary}
                style={[styles.textInput, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder, color: theme.text }]}
              />

              {/* Category Selection */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                {isTel ? 'కేటగిరీ *' : 'Category *'}
              </Text>
              <View style={{ gap: 8, marginBottom: 12 }}>
                {categories.map(cat => {
                  const isSel = newVideoCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setNewVideoCategoryId(cat.id)}
                      style={[styles.catRow, { backgroundColor: isSel ? theme.accentBackground : theme.backgroundSelected, borderColor: isSel ? theme.primary : theme.cardBorder, borderWidth: isSel ? 1.5 : 1 }]}
                    >
                      <View style={[styles.catRadio, { borderColor: isSel ? theme.primary : theme.textSecondary, backgroundColor: isSel ? theme.primary : 'transparent' }]} />
                      <MaterialCommunityIcons name={cat.icon as any} size={16} color={isSel ? theme.primary : theme.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={[styles.catRowText, { color: isSel ? theme.primary : theme.text }]}>
                        {isTel ? cat.labelTel : cat.labelEng}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Save Button */}
              <View style={[styles.modalActions, { marginTop: 16 }]}>
                <Button mode="outlined" style={{ flex: 1 }} textColor={theme.textSecondary} onPress={() => setAddVideoModalVisible(false)} disabled={savingVideo}>
                  {isTel ? 'రద్దు చేయి' : 'Cancel'}
                </Button>
                <Button
                  mode="contained"
                  buttonColor={theme.primary}
                  textColor="#ffffff"
                  style={{ flex: 1.4, marginLeft: 10 }}
                  onPress={handleSaveVideo}
                  loading={savingVideo}
                  disabled={savingVideo || !addVideoPreviewId || !newVideoTitle.trim()}
                >
                  {savingVideo
                    ? (isTel ? 'జోడిస్తోంది...' : 'Saving...')
                    : (isTel ? 'YouTube వీడియోను జోడించండి' : 'Add YouTube Video')}
                </Button>
              </View>

            </ScrollView>
          </Modal>
        </Portal>

      </View>
    </Portal.Host>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBrandRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  headerIconButton: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerBellBtn: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  headerBellBadge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: '#ef4444', minWidth: 17, height: 17,
    borderRadius: 9, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#ffffff',
  },
  headerBellBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '900' },

  feedScroll: { flex: 1 },

  // Top Section
  topSectionContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  topTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  topTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  topSubtitle: { fontSize: 12, marginTop: 2 },
  primaryAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 1,
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20,
    elevation: 2,
  },
  primaryAddBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

  // Search box
  searchBox: {
    minHeight: 46, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 9, marginLeft: 8 },

  // Live Banner
  liveBannerWrapper: { width: '100%', height: 180, overflow: 'hidden', marginVertical: 8 },
  liveBannerThumb: { width: '100%', height: '100%' },
  liveBannerGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', padding: 14,
  },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ff0000', alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20, marginBottom: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  livePillText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  liveBannerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 8, lineHeight: 19 },
  watchNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ff0000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, alignSelf: 'flex-start' },
  watchNowText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Filter Chips
  chipsScrollView: { marginTop: 6, marginBottom: 12 },
  chipsContainer: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12 },

  // Subscribe Card
  subscribeCard: {
    padding: 14, borderRadius: 16, borderWidth: 1,
    marginTop: 12, marginBottom: 4,
  },
  ytRedBadge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#ff0000', justifyContent: 'center', alignItems: 'center',
  },
  subscribeTitle: { fontSize: 16, fontWeight: '800' },
  subscribeSub: { fontSize: 12, marginTop: 1 },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ff0000', borderRadius: 12,
    paddingVertical: 9, marginTop: 4,
  },
  subscribeBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  // Recent Header
  recentHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  videoCountBadge: {
    height: 28, paddingHorizontal: 10,
    borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  videoCountText: { fontSize: 12, fontWeight: '800' },

  // Video Card
  videoCard: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden', elevation: 2,
  },
  thumbnailBox: {
    width: '100%', height: 195, position: 'relative',
    backgroundColor: '#0a0a0a',
  },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  // Duration Badge
  durationBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  durationText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  // Video Info & Actions
  videoInfo: { padding: 14, gap: 6 },
  videoTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  videoDateText: { fontSize: 12, fontWeight: '600', marginVertical: 2 },
  videoActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  actionBtnOutlineText: { fontSize: 13, fontWeight: '700' },
  actionBtnFilled: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  actionBtnFilledText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  actionDeleteBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  // Skeleton
  skeletonContainer: { paddingHorizontal: 16, gap: 16 },
  skeletonCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  skeletonThumb: { width: '100%', height: 180 },
  skeletonLine: { borderRadius: 4 },

  // Empty & Error
  emptyState: { marginHorizontal: 16, padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, textAlign: 'center' },
  errorBox: { marginHorizontal: 16, padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  errorTitle: { fontSize: 15, fontWeight: '800' },

  // Modals
  modal: { margin: 16, borderRadius: 20, padding: 20, elevation: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalIconBadge: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  inputLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  textInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14, marginBottom: 4,
  },
  modalActions: { flexDirection: 'row' },
  previewCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, overflow: 'hidden', marginBottom: 4, marginTop: 6 },
  previewThumb: { width: 90, height: 56 },
  validBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  catRadio: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginRight: 8 },
  catRowText: { fontSize: 14, fontWeight: '600' },
});

