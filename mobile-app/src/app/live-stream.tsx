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
} from 'react-native';
import { Text, Portal, Modal, Button, Avatar, Divider } from 'react-native-paper';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { liveVideosService } from '@/services/liveVideosService';

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
}

interface Category {
  id: string;
  labelEng: string;
  labelTel: string;
  icon: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function LiveStreamScreen() {
  const { liveSession, language, user, updateLiveYoutubeLink, joinLiveSession } = useApp();
  const theme = useTheme();

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
  const [activeTab, setActiveTab] = useState<'videos' | 'categories'>('videos');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [videoSearch, setVideoSearch] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Edit Stream modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Add Video modal
  const [addVideoModalVisible, setAddVideoModalVisible] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoCategoryId, setNewVideoCategoryId] = useState('sunday');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategoryField, setShowNewCategoryField] = useState(false);
  const [addVideoPreviewId, setAddVideoPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const loadVideos = async () => {
      const result = await liveVideosService.getVideos();
      if (!result.success) return;

      setVideos(result.videos.map(video => ({
        dbId: video._id,
        id: video.youtubeId,
        titleEng: video.title,
        titleTel: video.title,
        duration: '--:--',
        viewsEng: 'Recently added',
        viewsTel: 'Recently added',
        publishedEng: 'Recently added',
        publishedTel: 'Recently added',
        thumbnail: video.thumbnail,
        categoryId: video.categoryId,
      })));
    };

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
  const liveVideoId = liveSession?.song?.youtubeLink
    ? extractYoutubeId(liveSession.song.youtubeLink)
    : null;

  const streamStatus = liveVideoId
    ? (isTel ? 'ప్రస్తుతం ప్రత్యక్ష ప్రసారం జరుగుతోంది' : 'Service is live now')
    : (isTel ? 'తాజా సందేశాలు మరియు సేవలను చూడండి' : 'Watch messages and services anytime');

  // ── Theme helpers ─────────────────────────────────────────────────────────────
  const isDark = theme.background === '#09090b';
  const cardBg    = isDark ? '#1f1f1f' : theme.backgroundElement;
  const subtleText = isDark ? '#aaaaaa' : theme.textSecondary;
  const dividerColor = isDark ? '#2f2f2f' : theme.cardBorder;
  const activeTabUnderline = isDark ? '#ffffff' : theme.primary;
  const subscribeBg  = isDark ? '#ffffff' : theme.primary;
  const subscribedBg = isDark ? '#2a2a2a' : theme.backgroundSelected;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleUpdateLink = async () => {
    if (!streamUrl.trim()) {
      Alert.alert('', isTel ? 'దయచేసి యూట్యూబ్ వీడియో లింక్‌ను నమోదు చేయండి.' : 'Please enter a YouTube video URL.');
      return;
    }
    setSaving(true);
    try {
      await updateLiveYoutubeLink(streamUrl.trim());
      Alert.alert('', isTel ? '🎉 లైవ్ స్ట్రీమ్ లింక్ విజయవంతంగా అప్‌డేట్ చేయబడింది!' : '🎉 Live Stream link updated successfully!');
      setEditModalVisible(false);
      setStreamUrl('');
    } catch (err) {
      console.log('Update stream url error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUrlPreview = (url: string) => {
    setNewVideoUrl(url);
    setAddVideoPreviewId(extractYoutubeId(url));
    if (!newVideoTitle) setNewVideoTitle(isTel ? 'వీడియో శీర్షిక' : 'Video Title');
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const newCat: Category = { id: `cat_${Date.now()}`, labelEng: trimmed, labelTel: trimmed, icon: 'play-circle' };
    setCategories(prev => [...prev, newCat]);
    setNewVideoCategoryId(newCat.id);
    setNewCategoryInput('');
    setShowNewCategoryField(false);
  };

  const handleDeleteVideo = (videoId: string, title: string) => {
    if (!isAdmin) return;

    Alert.alert(
      isTel ? 'వీడియో తొలగించాలా?' : 'Delete video?',
      isTel ? `“${title}” తొలగించబడుతుంది.` : `“${title}” will be removed from this list.`,
      [
        { text: isTel ? 'రద్దు' : 'Cancel', style: 'cancel' },
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
          },
        },
      ],
    );
  };

  const handleSaveVideo = async () => {
    const vid = extractYoutubeId(newVideoUrl);
    if (!vid) { Alert.alert('', isTel ? 'సరైన యూట్యూబ్ లింక్‌ను నమోదు చేయండి.' : 'Please enter a valid YouTube URL.'); return; }
    if (!newVideoTitle.trim()) { Alert.alert('', isTel ? 'వీడియో శీర్షికను నమోదు చేయండి.' : 'Please enter a video title.'); return; }
    const result = await liveVideosService.addVideo({
      youtubeUrl: newVideoUrl.trim(),
      title: newVideoTitle.trim(),
      categoryId: newVideoCategoryId,
    });
    if (!result.success || !result.video) {
      Alert.alert('', result.message || 'Unable to save video.');
      return;
    }

    const newVideo: VideoItem = {
      dbId: result.video._id,
      id: result.video.youtubeId,
      titleEng: result.video.title, titleTel: result.video.title,
      duration: '--:--',
      viewsEng: 'Just added', viewsTel: 'ఇప్పుడే జోడించారు',
      publishedEng: 'Today', publishedTel: 'నేడు',
      thumbnail: result.video.thumbnail,
      categoryId: result.video.categoryId,
    };
    setVideos(prev => [newVideo, ...prev]);
    setAddVideoModalVisible(false);
    setNewVideoUrl(''); setNewVideoTitle(''); setAddVideoPreviewId(null);
    setNewVideoCategoryId('sunday'); setShowNewCategoryField(false); setNewCategoryInput('');
    setActiveTab('videos'); setSelectedCategoryFilter(newVideoCategoryId);
    Alert.alert('', isTel ? '✅ వీడియో విజయవంతంగా జోడించబడింది!' : '✅ Video added successfully!');
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <Portal.Host>
      <View style={[styles.container, { backgroundColor: theme.background }]}>

        {/* ── Modern App Header ──────────────────────────────────────────────── */}
        <View style={[styles.appHeader, { display: 'none' }]}>
          <View style={styles.headerBrandRow}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.headerIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="youtube" size={20} color="#fff" />
            </LinearGradient>

            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerEyebrow, { color: '#c7d2fe' }]}>
                {isTel ? 'ఆరాధన • మీడియా' : 'WORSHIP • MEDIA'}
              </Text>
              <Text style={[styles.headerTitle, { color: '#ffffff' }]} numberOfLines={1}>
                {isTel ? 'లైవ్ ఆరాధన' : 'Sanctuary Live'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {canEditStream && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => { setStreamUrl(liveSession?.song?.youtubeLink || ''); setEditModalVisible(true); }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="broadcast" size={19} color="#ffffff" />
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity
                style={styles.headerAddButton}
                onPress={() => setAddVideoModalVisible(true)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="plus" size={17} color="#312e81" />
                <Text style={styles.headerAddButtonText}>{isTel ? 'వీడియో' : 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.headerStatusBar, { display: 'none' }]}>
          <View style={[styles.headerStatusPill, { backgroundColor: liveVideoId ? '#dc2626' : (isDark ? '#3f3f46' : '#dbe4ff') }]}>
            <View style={[styles.headerStatusDot, { backgroundColor: liveVideoId ? '#ffffff' : (isDark ? '#a1a1aa' : '#6366f1') }]} />
            <Text style={[styles.headerStatusText, { color: liveVideoId ? '#ffffff' : (isDark ? '#e4e4e7' : '#4338ca') }]}>
              {liveVideoId ? 'LIVE NOW' : 'OFFLINE'}
            </Text>
          </View>
          <Text style={[styles.headerStatusDescription, { color: isDark ? '#c4b5fd' : '#4338ca' }]} numberOfLines={1}>
            {streamStatus}
          </Text>
        </View>

        <ScrollView style={styles.feedScroll} showsVerticalScrollIndicator={false}>

          {/* ── Live Banner (shown when a live session is active) ─────────────── */}
          {liveVideoId && (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => openInYouTube(liveVideoId)}
              style={styles.liveBannerWrapper}
            >
              <Image
                source={{ uri: `https://img.youtube.com/vi/${liveVideoId}/maxresdefault.jpg` }}
                style={styles.liveBannerThumb}
                resizeMode="cover"
              />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.liveBannerGradient}>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
                <Text style={styles.liveBannerTitle} numberOfLines={2}>
                  {liveSession?.song?.title || (isTel ? 'లైవ్ ఆరాధన నడుస్తోంది' : 'Live Worship in Progress')}
                </Text>
                <View style={styles.liveBannerActions}>
                  <View style={styles.watchNowBtn}>
                    <MaterialCommunityIcons name="play-circle" size={16} color="#fff" />
                    <Text style={styles.watchNowText}>{isTel ? 'యూట్యూబ్‌లో చూడండి' : 'Watch on YouTube'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); shareVideo(liveVideoId, isTel ? 'లైవ్ ఆరాధన' : 'Live Worship'); }}
                    style={styles.liveBannerShare}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons name="share-variant" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── No Live Banner (placeholder when no live session) ─────────────── */}
          {!liveVideoId && (
            <View style={[styles.noLiveBanner, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <LinearGradient colors={['#6366f120', '#ec489920']} style={styles.noLiveIconBg}>
                <MaterialCommunityIcons name="youtube" size={32} color="#ff0000" />
              </LinearGradient>
              <Text style={[styles.noLiveTitle, { color: theme.text }]}>
                {isTel ? 'ఇప్పుడు లైవ్ లేదు' : 'No Live Stream Right Now'}
              </Text>
              <Text style={[styles.noLiveSubtitle, { color: subtleText }]}>
                {isTel ? 'కింద ఉన్న రికార్డెడ్ వీడియోలు చూడండి' : 'Browse recorded videos below'}
              </Text>
            </View>
          )}

          {/* ── Channel Header ───────────────────────────────────────────────── */}
          <View style={[styles.channelHeader, { backgroundColor: theme.backgroundElement, borderColor: dividerColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Avatar.Icon size={48} icon="church" style={{ backgroundColor: '#ff0000' }} color="#ffffff" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.channelName, { color: theme.text }]}>
                  {isTel ? 'సన్యాసి లైవ్ చానల్' : 'Sanctuary Connect Church'}
                </Text>
                <Text style={[styles.channelSubs, { color: subtleText }]}>
                  {isTel ? '12.4వేల మంది చందాదారులు • 184 వీడియోలు' : '12.4K subscribers • 184 videos'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.subscribeBtn, { backgroundColor: isSubscribed ? subscribedBg : subscribeBg }]}
              onPress={() => setIsSubscribed(v => !v)}
            >
              <Text style={[styles.subscribeBtnText, { color: isSubscribed ? subtleText : '#ffffff' }]}>
                {isSubscribed ? (isTel ? 'చందాదారులయ్యారు' : 'Subscribed') : (isTel ? 'సబ్‌స్క్రయిబ్' : 'Subscribe')}
              </Text>
            </TouchableOpacity>
          </View>

          {isAdmin && (
            <View style={[styles.adminPanel, { backgroundColor: isDark ? '#171717' : '#fff7f7', borderColor: isDark ? '#3a2020' : '#ffd6d6' }]}>
              <View style={styles.adminPanelIcon}>
                <MaterialCommunityIcons name="shield-account" size={18} color="#ff0000" />
              </View>
              <View style={styles.adminPanelText}>
                <Text style={[styles.adminPanelTitle, { color: theme.text }]}>
                  {isTel ? 'అడ్మిన్ వీడియో మేనేజ్‌మెంట్' : 'Admin Video Management'}
                </Text>
                <Text style={[styles.adminPanelSubtitle, { color: subtleText }]}>
                  {isTel ? 'వీడియోలను జోడించండి, నిర్వహించండి మరియు తొలగించండి' : 'Add, manage and remove church videos'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.adminAddButton}
                onPress={() => setAddVideoModalVisible(true)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={styles.adminAddButtonText}>{isTel ? 'జోడించు' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Divider style={{ backgroundColor: dividerColor }} />

          {/* ── Tabs ─────────────────────────────────────────────────────────── */}
          <View style={[styles.tabsRow, { backgroundColor: theme.backgroundElement }]}>
            {(['videos', 'categories'] as const).map(tab => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabItem, isActive && { backgroundColor: theme.accentBackground, borderColor: activeTabUnderline, borderWidth: 1 }]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabItemText, { color: isActive ? theme.primary : subtleText }]}>
                    {tab === 'videos'
                      ? (isTel ? 'వీడియోలు' : 'Videos')
                      : (isTel ? 'కేటగిరీలు' : 'Categories')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Divider style={{ backgroundColor: dividerColor }} />

          {/* ── Videos Tab ───────────────────────────────────────────────────── */}
          {activeTab === 'videos' ? (
            <View style={styles.listContainer}>

              {/* Search */}
              <View style={[styles.searchBox, { backgroundColor: theme.backgroundSelected, borderColor: dividerColor }]}>
                <MaterialCommunityIcons name="magnify" size={19} color={subtleText} />
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

              {/* Category filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                {[{ id: 'all', labelEng: 'All', labelTel: 'అన్నీ', icon: 'view-grid' }, ...categories].map(cat => {
                  const isActive = selectedCategoryFilter === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryFilter(cat.id)}
                      style={[styles.chip, { backgroundColor: isActive ? theme.primary : theme.backgroundSelected, borderColor: isActive ? theme.primary : theme.cardBorder }]}
                    >
                      <MaterialCommunityIcons name={(cat as any).icon as any} size={12} color={isActive ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.chipText, { color: isActive ? '#fff' : theme.textSecondary }]}>
                        {isTel ? cat.labelTel : cat.labelEng}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.recentHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {isTel ? 'ఇటీవలి వీడియోలు' : 'Recent Videos'}
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: subtleText }]}>
                    {isTel ? 'తాజాగా జోడించిన ఆరాధన వీడియోలు' : 'Latest worship messages and services'}
                  </Text>
                </View>
                <View style={[styles.videoCountBadge, { backgroundColor: theme.accentBackground }]}>
                  <MaterialCommunityIcons name="video-outline" size={14} color={theme.primary} />
                  <Text style={[styles.videoCountText, { color: theme.primary }]}>
                    {filteredVideos.length}
                  </Text>
                </View>
              </View>

              {filteredVideos.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: dividerColor }]}>
                  <MaterialCommunityIcons name="video-off-outline" size={38} color={subtleText} style={{ opacity: 0.6, marginBottom: 8 }} />
                  <Text style={{ color: subtleText, fontSize: 14, textAlign: 'center' }}>
                    {isTel ? 'ఈ కేటగిరీలో వీడియోలు లేవు.' : 'No videos in this category yet.'}
                  </Text>
                </View>
              ) : filteredVideos.map(item => {
                const cat = categories.find(c => c.id === item.categoryId);
                const ytUrl = youtubeUrl(item.id);
                const title = isTel ? item.titleTel : item.titleEng;
                return (
                  <View key={item.id} style={[styles.videoCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
                    {/* Large YouTube thumbnail */}
                    <TouchableOpacity activeOpacity={0.9} onPress={() => openInYouTube(item.id)} style={styles.thumbnailBox}>
                      <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} resizeMode="cover" />
                      <View style={styles.thumbnailShade} />
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{item.duration}</Text>
                      </View>
                      <View style={styles.playOverlay}>
                        <View style={styles.playCircle}>
                          <MaterialCommunityIcons name="play" size={22} color="#fff" />
                        </View>
                      </View>
                      <View style={styles.youtubeCornerBadge}>
                        <MaterialCommunityIcons name="youtube" size={15} color="#fff" />
                      </View>
                    </TouchableOpacity>

                    {/* Video information */}
                    <View style={styles.videoInfo}>
                      <View style={styles.videoTopRow}>
                        {cat && (
                          <View style={[styles.catBadge, { backgroundColor: theme.accentBackground }]}>
                            <MaterialCommunityIcons name={cat.icon as any} size={11} color={theme.primary} />
                            <Text style={[styles.catBadgeText, { color: theme.primary }]} numberOfLines={1}>
                              {isTel ? cat.labelTel : cat.labelEng}
                            </Text>
                          </View>
                        )}
                        {isAdmin && (
                          <TouchableOpacity
                            style={[styles.videoMoreButton, { backgroundColor: theme.backgroundSelected }]}
                            onPress={() => item.dbId && handleDeleteVideo(item.dbId, title)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialCommunityIcons name="delete-outline" size={17} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <TouchableOpacity activeOpacity={0.7} onPress={() => openInYouTube(item.id)}>
                        <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
                      </TouchableOpacity>

                      <View style={styles.videoMetaRow}>
                        <MaterialCommunityIcons name="eye-outline" size={13} color={subtleText} />
                        <Text style={[styles.videoMeta, { color: subtleText }]} numberOfLines={1}>
                          {isTel ? item.viewsTel : item.viewsEng}
                        </Text>
                        <View style={[styles.metaDot, { backgroundColor: subtleText }]} />
                        <MaterialCommunityIcons name="clock-outline" size={13} color={subtleText} />
                        <Text style={[styles.videoMeta, { color: subtleText }]} numberOfLines={1}>
                          {isTel ? item.publishedTel : item.publishedEng}
                        </Text>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.videoActions}>
                        <TouchableOpacity
                          style={[styles.videoActionBtn, { backgroundColor: '#ff000015', borderColor: '#ff000030' }]}
                          onPress={() => openInYouTube(item.id)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="youtube" size={14} color="#ff0000" />
                          <Text style={[styles.videoActionText, { color: '#ff0000' }]}>
                            {isTel ? 'చూడండి' : 'Watch'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.videoActionBtn, { backgroundColor: theme.accentBackground, borderColor: theme.primary + '40' }]}
                          onPress={() => shareVideo(item.id, title)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="share-variant" size={14} color={theme.primary} />
                          <Text style={[styles.videoActionText, { color: theme.primary }]}>
                            {isTel ? 'షేర్' : 'Share'}
                          </Text>
                        </TouchableOpacity>

                        {isAdmin && (
                          <TouchableOpacity
                            style={[styles.videoIconAction, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}
                            onPress={() => item.dbId && handleDeleteVideo(item.dbId, title)}
                            activeOpacity={0.8}
                            accessibilityLabel={isTel ? 'వీడియో తొలగించు' : 'Delete video'}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

          ) : (
            /* ── Categories Tab ─────────────────────────────────────────────── */
            <View style={styles.listContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {isTel ? 'వీడియో కేటగిరీలు' : 'Video Categories'}
              </Text>
              {categories.map(cat => {
                const count = videos.filter(v => v.categoryId === cat.id).length;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.8}
                    style={[styles.catCard, { backgroundColor: cardBg, borderColor: dividerColor }]}
                    onPress={() => { setSelectedCategoryFilter(cat.id); setActiveTab('videos'); }}
                  >
                    <View style={[styles.catCardIconBox, { backgroundColor: theme.accentBackground }]}>
                      <MaterialCommunityIcons name={cat.icon as any} size={24} color={theme.primary} />
                    </View>
                    <View style={styles.catCardInfo}>
                      <Text style={[styles.catCardTitle, { color: theme.text }]}>
                        {isTel ? cat.labelTel : cat.labelEng}
                      </Text>
                      <Text style={[styles.catCardMeta, { color: subtleText }]}>
                        {count} {isTel ? 'వీడియోలు' : 'videos'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={subtleText} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

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
              <Button mode="outlined" style={{ flex: 1 }} textColor={theme.textSecondary} onPress={() => setEditModalVisible(false)} disabled={saving}>
                {isTel ? 'రద్దు' : 'Cancel'}
              </Button>
              <Button mode="contained" buttonColor="#ff0000" textColor="#fff" style={{ flex: 1, marginLeft: 10 }} onPress={handleUpdateLink} loading={saving} disabled={saving}>
                {isTel ? 'గో లైవ్' : 'Go Live'}
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* MODAL 2 — Add Video (Admin only)                                      */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <Portal>
          <Modal
            visible={addVideoModalVisible}
            onDismiss={() => { setAddVideoModalVisible(false); setShowNewCategoryField(false); }}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.backgroundElement, maxHeight: '92%' }]}
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <View style={styles.modalHeader}>
                <LinearGradient colors={['#6366f1', '#ec4899']} style={styles.modalIconBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <MaterialCommunityIcons name="youtube" size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {isTel ? 'వీడియో జోడించండి' : 'Add Video'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    {isTel ? 'యూట్యూబ్ లింక్ పేస్ట్ చేయండి' : 'Paste a YouTube link to add a video'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setAddVideoModalVisible(false); setShowNewCategoryField(false); }}>
                  <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Divider style={{ backgroundColor: theme.cardBorder, marginVertical: 14 }} />

              {/* YouTube URL */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {isTel ? 'యూట్యూబ్ వీడియో లింక్ *' : 'YouTube Video URL *'}
              </Text>
              <RNTextInput
                value={newVideoUrl}
                onChangeText={handleUrlPreview}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.textInput, { backgroundColor: theme.backgroundSelected, borderColor: addVideoPreviewId ? theme.primary : theme.cardBorder, color: theme.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Thumbnail Preview */}
              {addVideoPreviewId && (
                <View style={[styles.previewCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.primary }]}>
                  <Image source={{ uri: `https://img.youtube.com/vi/${addVideoPreviewId}/hqdefault.jpg` }} style={styles.previewThumb} resizeMode="cover" />
                  <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
                    <View style={styles.validBadge}>
                      <MaterialCommunityIcons name="check-circle" size={12} color="#16a34a" />
                      <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700', marginLeft: 4 }}>
                        {isTel ? 'లింక్ చెల్లుబాటు' : 'Valid YouTube link'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>ID: {addVideoPreviewId}</Text>
                  </View>
                </View>
              )}

              {/* Video Title */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                {isTel ? 'వీడియో శీర్షిక *' : 'Video Title *'}
              </Text>
              <RNTextInput
                value={newVideoTitle}
                onChangeText={setNewVideoTitle}
                placeholder={isTel ? 'ఆదివారపు ఆరాధన - ఆగస్టు 2025' : 'Sunday Worship - August 2025'}
                placeholderTextColor={theme.textSecondary}
                style={[styles.textInput, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder, color: theme.text }]}
              />

              {/* Category Picker */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                {isTel ? 'కేటగిరీ *' : 'Category *'}
              </Text>
              <View style={{ gap: 8, marginBottom: 8 }}>
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

              {/* New Category */}
              {!showNewCategoryField ? (
                <TouchableOpacity style={[styles.newCatBtn, { borderColor: theme.primary }]} onPress={() => setShowNewCategoryField(true)}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={16} color={theme.primary} />
                  <Text style={[styles.newCatBtnText, { color: theme.primary }]}>
                    {isTel ? '+ కొత్త కేటగిరీ సృష్టించండి' : '+ Create New Category'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.newCatRow, { backgroundColor: theme.backgroundSelected, borderColor: theme.primary }]}>
                  <RNTextInput
                    value={newCategoryInput}
                    onChangeText={setNewCategoryInput}
                    placeholder={isTel ? 'కేటగిరీ పేరు...' : 'Category name...'}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.newCatInput, { color: theme.text }]}
                    autoFocus
                  />
                  <TouchableOpacity style={[styles.newCatSaveBtn, { backgroundColor: theme.primary }]} onPress={handleAddNewCategory}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{isTel ? 'సృష్టించు' : 'Create'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 4 }} onPress={() => { setShowNewCategoryField(false); setNewCategoryInput(''); }}>
                    <MaterialCommunityIcons name="close" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Save Actions */}
              <View style={[styles.modalActions, { marginTop: 20 }]}>
                <Button mode="outlined" style={{ flex: 1 }} textColor={theme.textSecondary} onPress={() => { setAddVideoModalVisible(false); setShowNewCategoryField(false); }}>
                  {isTel ? 'రద్దు' : 'Cancel'}
                </Button>
                <Button mode="contained" buttonColor={theme.primary} textColor="#fff" style={{ flex: 1, marginLeft: 10 }} onPress={handleSaveVideo} disabled={!addVideoPreviewId || !newVideoTitle.trim()}>
                  {isTel ? 'సేవ్ చేయి' : 'Add Video'}
                </Button>
              </View>

            </ScrollView>
          </Modal>
        </Portal>

      </View>
    </Portal.Host>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Modern Header
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 14,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerBrandRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 11,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 2 },
  headerTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 },
  headerIconButton: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerAddButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ffffff', paddingHorizontal: 12, height: 38,
    borderRadius: 12,
  },
  headerAddButtonText: { color: '#312e81', fontSize: 12, fontWeight: '800' },
  headerStatusBar: {
    minHeight: 44, paddingHorizontal: 16, borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 9,
  },
  headerStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  headerStatusDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  headerStatusDescription: { flex: 1, fontSize: 12, fontWeight: '600' },

  feedScroll: { flex: 1 },

  // Live Banner
  liveBannerWrapper: { width: '100%', height: 210, overflow: 'hidden' },
  liveBannerThumb: { width: '100%', height: '100%' },
  liveBannerGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 14,
  },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ff0000', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, marginBottom: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  livePillText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  liveBannerTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10, lineHeight: 20 },
  liveBannerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  watchNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ff0000', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  watchNowText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  liveBannerShare: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // No-live placeholder
  noLiveBanner: {
    margin: 16, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
  },
  noLiveIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  noLiveTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  noLiveSubtitle: { fontSize: 13, textAlign: 'center' },

  // Channel Header
  channelHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  channelName: { fontSize: 15, fontWeight: 'bold' },
  channelSubs: { fontSize: 12, marginTop: 2 },
  subscribeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  subscribeBtnText: { fontSize: 13, fontWeight: 'bold' },

  // Admin controls
  adminPanel: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 2,
    padding: 12, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
  },
  adminPanelIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#ff000015', justifyContent: 'center', alignItems: 'center',
  },
  adminPanelText: { flex: 1, marginHorizontal: 10 },
  adminPanelTitle: { fontSize: 13, fontWeight: '800' },
  adminPanelSubtitle: { fontSize: 11, marginTop: 2 },
  adminAddButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ff0000', paddingHorizontal: 11, paddingVertical: 8,
    borderRadius: 20,
  },
  adminAddButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderBottomWidth: 0, borderBottomColor: 'transparent' },
  tabItemText: { fontWeight: 'bold', fontSize: 14 },

  // Recent Videos
  listContainer: { padding: 16 },
  searchBox: {
    minHeight: 46, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center',
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 9, marginLeft: 8 },
  recentHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 13,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  sectionSubtitle: { fontSize: 11, lineHeight: 16 },
  videoCountBadge: {
    minWidth: 38, height: 32, paddingHorizontal: 9,
    borderRadius: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  videoCountText: { fontSize: 12, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },

  // Modern Video Card
  videoCard: {
    marginBottom: 16, borderRadius: 17, borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailBox: {
    width: '100%', height: 190, position: 'relative',
    backgroundColor: '#111',
  },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  durationBadge: {
    position: 'absolute', bottom: 9, right: 9,
    backgroundColor: 'rgba(0,0,0,0.84)',
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6,
  },
  durationText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  youtubeCornerBadge: {
    position: 'absolute', top: 10, left: 10,
    width: 30, height: 24, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center', alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  playCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
    elevation: 4,
  },
  videoInfo: { padding: 13, gap: 7 },
  videoTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', minHeight: 24,
  },
  catBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 7, gap: 4,
    maxWidth: '82%',
  },
  catBadgeText: { fontSize: 10, fontWeight: '800' },
  videoMoreButton: {
    width: 30, height: 30, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  videoTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  videoMetaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5,
  },
  metaDot: { width: 3, height: 3, borderRadius: 2, marginHorizontal: 2 },
  videoMeta: { fontSize: 11, flexShrink: 1 },
  videoActions: { flexDirection: 'row', gap: 8, marginTop: 3 },
  videoActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 9, borderWidth: 1, minWidth: 76,
  },
  videoActionText: { fontSize: 11, fontWeight: '800' },
  videoIconAction: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  emptyState: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 8 },

  // Category cards
  catCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1 },
  catCardIconBox: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catCardInfo: { flex: 1, marginLeft: 12 },
  catCardTitle: { fontSize: 14, fontWeight: 'bold' },
  catCardMeta: { fontSize: 12, marginTop: 2 },

  // Modals
  modal: { margin: 16, borderRadius: 20, padding: 20, elevation: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalIconBadge: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  textInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14, marginBottom: 4,
  },
  modalActions: { flexDirection: 'row' },

  // Add Video extras
  previewCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, overflow: 'hidden', marginBottom: 4, marginTop: 6 },
  previewThumb: { width: 90, height: 56 },
  validBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  catRadio: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginRight: 8 },
  catRowText: { fontSize: 14, fontWeight: '500' },
  newCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4 },
  newCatBtnText: { fontSize: 13, fontWeight: '700' },
  newCatRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6, gap: 8, marginTop: 4 },
  newCatInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
  newCatSaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});
