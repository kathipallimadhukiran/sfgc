import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, View, Platform, useWindowDimensions,
  TouchableOpacity, FlatList, TextInput,
  Animated, StatusBar, ScrollView, Alert, Modal as RNModal,
  Linking, Clipboard, Share, Image
} from 'react-native';
import { Text, Portal, Modal, Button, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SongItem } from '@/services/songsService';
import { apiClient } from '@/services/apiClient';
import { API_URL } from '@/constants/config';

const OPERATOR_ROLES = ['Admin', 'Super Admin', 'Worship Leader', 'Choir Leader', 'Media Team'];

// Quick announcement presets
const ANNOUNCEMENT_PRESETS = [
  { icon: 'hand-clap', titleTel: 'చప్పట్లు కొట్టండి', titleEng: 'Clap Hands', text: '👏 దేవునికి మహిమకరముగా చప్పట్లు కొడదాం!' },
  { icon: 'hands-pray', titleTel: 'ప్రార్థనకు నిలబడండి', titleEng: 'Stand Up for Prayer', text: '🙏 దయచేసి ప్రార్థన కొరకు నిలబడండి / మోకరించండి.' },
  { icon: 'account-group', titleTel: 'స్వాగతం', titleEng: 'Welcome', text: '⛪ SFGC (శాటిలైట్ సిటీ ఫుల్ గోస్పెల్ చర్చి) ఆరాధనకు మీకు హృదయపూర్వక స్వాగతం!' },
  { icon: 'cash-multiple', titleTel: 'దశమ భాగాలు & కానుకలు', titleEng: 'Offering & Tithes', text: '💸 ప్రభువునకు దశమ భాగాలు మరియు కానుకలు అర్పించే సమయం.' },
];

export default function LiveLyricsScreen() {
  const {
    liveSession, joinLiveSession, leaveLiveSession, language, user,
    songs, socket, startLiveSession, endLiveSession,
    addToSetlist, setlist, notices,
  } = useApp();

  const isTel = language === 'Telugu';
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const isOperator = user && OPERATOR_ROLES.includes(user.role);

  // ── Local State ────────────────────────────────────────────────────────────
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [blackScreen, setBlackScreen] = useState(false);
  const [blankScreen, setBlankScreen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [highlightLine, setHighlightLine] = useState(-1);
  const [activeNoticeText, setActiveNoticeText] = useState<string | null>(null);

  // Modals
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [showCustomNoteModal, setShowCustomNoteModal] = useState(false);
  const [customNoteText, setCustomNoteText] = useState('');
  const [showCastModal, setShowCastModal] = useState(false);
  const [castingDevice, setCastingDevice] = useState<string | null>(null);
  const [isSearchingDevices, setIsSearchingDevices] = useState(false);

  // Dynamic TV Cast State
  const [dynamicTvDevices, setDynamicTvDevices] = useState<{ id?: string; name: string; type: string; ip: string; connectedAt?: string; isCustom?: boolean }[]>([]);
  const [tvCastInfo, setTvCastInfo] = useState<{ hostIp?: string; port?: number; tvWebUrl?: string; projectionUrl?: string; pairingCode?: string } | null>(null);
  const [showAddTvModal, setShowAddTvModal] = useState(false);
  const [newTvName, setNewTvName] = useState('');
  const [newTvIp, setNewTvIp] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const isUserSwipingRef = useRef(false);
  const isLocalChangeRef = useRef(false);

  // Pre-load song from params if navigated with songId
  useEffect(() => {
    if (params?.songId && songs.length > 0) {
      const found = songs.find((s: SongItem) => (s._id || s.id) === params.songId);
      if (found) {
        setSelectedSong(found);
        setCurrentSlide(0);
        setHighlightLine(-1);
        setActiveNoticeText(null);
      }
    }
  }, [params?.songId, songs]);

  // Keep FlatList position in sync with currentSlide (only if not actively swiping)
  useEffect(() => {
    if (!isUserSwipingRef.current && flatListRef.current && selectedSong?.lyrics && selectedSong.lyrics.length > 0) {
      if (currentSlide >= 0 && currentSlide < selectedSong.lyrics.length) {
        try {
          flatListRef.current.scrollToIndex({ index: currentSlide, animated: true });
        } catch (_) {}
      }
    }
  }, [currentSlide, selectedSong]);

  // ── Safe Back Navigation ───────────────────────────────────────────────────
  const handleSafeBack = () => {
    router.replace('/songs');
  };

  // ── Socket Connection & Sync ───────────────────────────────────────────────
  useEffect(() => {
    joinLiveSession();
  }, []);

  useEffect(() => {
    if (!liveSession) return;
    setIsLive(true);
    setBlackScreen(liveSession.blackScreen ?? false);
    setBlankScreen(liveSession.blankScreen ?? false);
    setHighlightLine(liveSession.highlightedLineIndex ?? -1);

    if (liveSession.song && liveSession.song.category !== 'Announcement') {
      const incomingId = liveSession.song._id || liveSession.song.id;
      const currentId = selectedSong?._id || selectedSong?.id;
      if (!selectedSong || (incomingId && incomingId !== currentId)) {
        setSelectedSong(liveSession.song);
        if (typeof liveSession.currentSlideIndex === 'number') {
          setCurrentSlide(liveSession.currentSlideIndex);
        }
        return;
      }
    }

    if (typeof liveSession.currentSlideIndex === 'number') {
      if (isLocalChangeRef.current) {
        isLocalChangeRef.current = false;
      } else if (!isUserSwipingRef.current) {
        if (liveSession.currentSlideIndex !== currentSlide) {
          setCurrentSlide(liveSession.currentSlideIndex);
        }
      }
    }
  }, [liveSession]);

  // ── Pulse Animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLive]);

  const emit = (event: string, payload?: any) => socket?.emit(event, payload);

  const handleGoLive = () => {
    if (!selectedSong) {
      setShowSongPicker(true);
      return;
    }
    isLocalChangeRef.current = true;
    startLiveSession(selectedSong, 0);
    setIsLive(true);
    setCurrentSlide(0);
    setHighlightLine(-1);
    setActiveNoticeText(null);
  };

  const handleEndSession = () => {
    endLiveSession();
    setIsLive(false);
    setActiveNoticeText(null);
  };

  const handleChangeSlide = (dir: 'next' | 'prev') => {
    if (!selectedSong) return;
    const total = selectedSong.lyrics?.length ?? 0;
    const next = dir === 'next'
      ? Math.min(currentSlide + 1, total - 1)
      : Math.max(currentSlide - 1, 0);
    if (next === currentSlide) return;

    isUserSwipingRef.current = false;
    isLocalChangeRef.current = true;
    setCurrentSlide(next);
    setHighlightLine(-1);
    setActiveNoticeText(null);

    if (!isLive) {
      startLiveSession(selectedSong, next);
      setIsLive(true);
    } else {
      emit('changeSlide', { currentSlideIndex: next, highlightedLineIndex: -1 });
    }
  };

  const handleSelectSlideIndex = (index: number) => {
    isUserSwipingRef.current = false;
    isLocalChangeRef.current = true;
    setCurrentSlide(index);
    setHighlightLine(-1);
    setActiveNoticeText(null);

    if (!isLive && selectedSong) {
      startLiveSession(selectedSong, index);
      setIsLive(true);
    } else {
      emit('changeSlide', { currentSlideIndex: index, highlightedLineIndex: -1 });
    }
  };

  const handleScrollBeginDrag = () => {
    isUserSwipingRef.current = true;
  };

  const handleScrollEndDrag = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const layoutWidth = e.nativeEvent.layoutMeasurement.width || width;
    if (layoutWidth > 0 && selectedSong?.lyrics) {
      const newIdx = Math.round(contentOffsetX / layoutWidth);
      if (newIdx >= 0 && newIdx < selectedSong.lyrics.length) {
        if (newIdx !== currentSlide) {
          isLocalChangeRef.current = true;
          setCurrentSlide(newIdx);
          setHighlightLine(-1);
          setActiveNoticeText(null);
          emit('changeSlide', { currentSlideIndex: newIdx, highlightedLineIndex: -1 });
        }
      }
    }
    setTimeout(() => {
      isUserSwipingRef.current = false;
    }, 150);
  };

  const handleMomentumScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const layoutWidth = e.nativeEvent.layoutMeasurement.width || width;
    if (layoutWidth > 0 && selectedSong?.lyrics) {
      const newIdx = Math.round(contentOffsetX / layoutWidth);
      if (newIdx >= 0 && newIdx < selectedSong.lyrics.length) {
        if (newIdx !== currentSlide) {
          isLocalChangeRef.current = true;
          setCurrentSlide(newIdx);
          setHighlightLine(-1);
          setActiveNoticeText(null);
          emit('changeSlide', { currentSlideIndex: newIdx, highlightedLineIndex: -1 });
        }
      }
    }
    setTimeout(() => {
      isUserSwipingRef.current = false;
    }, 150);
  };

  const handleSelectSong = (song: SongItem) => {
    setSelectedSong(song);
    setCurrentSlide(0);
    setHighlightLine(-1);
    setActiveNoticeText(null);
    setShowSongPicker(false);
    isLocalChangeRef.current = true;
    if (isLive) startLiveSession(song, 0);
  };

  const handleHighlight = (lineIdx: number) => {
    const newHL = highlightLine === lineIdx ? -1 : lineIdx;
    setHighlightLine(newHL);
    emit('highlightLine', { lineIndex: newHL });
  };

  const handleScreenState = (state: 'normal' | 'black' | 'blank') => {
    const nb = state === 'black';
    const nbl = state === 'blank';
    setBlackScreen(nb);
    setBlankScreen(nbl);
    emit('screenState', { blackScreen: nb, blankScreen: nbl });
  };

  // Broadcast Custom Announcement/Note directly onto Smart TV & Audience Screens
  const handleBroadcastAnnouncement = (textToBroadcast: string, customTitle?: string) => {
    if (!textToBroadcast.trim()) return;
    const trimmed = textToBroadcast.trim();
    const displayTitle = customTitle || (isTel ? '📢 సభ ప్రకటన' : '📢 Church Announcement');
    setActiveNoticeText(customTitle ? `${displayTitle}: ${trimmed}` : trimmed);
    const noteSongObj: SongItem = {
      _id: 'custom_announcement_' + Date.now(),
      title: displayTitle,
      language: 'Telugu',
      category: 'Announcement',
      lyrics: [{ type: 'Announcement', text: customTitle ? `${customTitle}\n\n${trimmed}` : trimmed }],
    };
    isLocalChangeRef.current = true;
    startLiveSession(noteSongObj, 0);
    setIsLive(true);
    setShowCustomNoteModal(false);
    setCustomNoteText('');
  };

  const handleShareTvLink = async () => {
    let url = tvCastInfo?.tvWebUrl;
    if (!url) {
      try {
        const res = await apiClient.get('/stream/cast-info');
        if (res && res.tvWebUrl) url = res.tvWebUrl;
      } catch (e) {}
    }
    if (!url) {
      url = `${API_URL}/tv.html`;
    }
    try {
      await Share.share({
        message: isTel
          ? ` SFGC స్మార్ట్ TV లైవ్ లిరిక్స్ డిస్ప్లే లింక్:\n${url}`
          : `SFGC Smart TV Live Lyrics Display Link:\n${url}`,
        title: 'Smart TV Live Lyrics Display Link',
      });
    } catch (_) {
      Clipboard.setString(url);
      Alert.alert('TV Link Copied', url);
    }
  };

  const handleClearNotice = () => {
    setActiveNoticeText(null);
    if (selectedSong && isLive) {
      isLocalChangeRef.current = true;
      startLiveSession(selectedSong, currentSlide);
    }
  };

  // Dynamic TV Discovery & Network Fetch
  const fetchTvCastInfo = async () => {
    setIsSearchingDevices(true);
    try {
      const res = await apiClient.get('/stream/cast-info');
      if (res && res.success) {
        setTvCastInfo({
          hostIp: res.hostIp,
          port: res.port,
          tvWebUrl: res.tvWebUrl,
          projectionUrl: res.projectionUrl,
          pairingCode: res.pairingCode,
        });

        const backendDisplays = (res.connectedDisplays || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type || 'Smart TV Web Display',
          ip: d.ip || res.hostIp,
          connectedAt: d.connectedAt,
        }));

        const storedCustom = await AsyncStorage.getItem('custom_tv_devices');
        const customDevices = storedCustom ? JSON.parse(storedCustom) : [];

        const merged = [...backendDisplays];
        customDevices.forEach((c: any) => {
          if (!merged.some((m) => m.ip === c.ip || m.name === c.name)) {
            merged.push(c);
          }
        });
        setDynamicTvDevices(merged);
      }
    } catch (err) {
      console.log('Error fetching TV cast info:', err);
    } finally {
      setIsSearchingDevices(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleDisplaysUpdated = (displays: any[]) => {
      if (Array.isArray(displays)) {
        const backendDevices = displays.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type || 'Smart TV Web Display',
          ip: d.ip || 'Local Network',
          connectedAt: d.connectedAt,
        }));

        AsyncStorage.getItem('custom_tv_devices').then((stored) => {
          const custom = stored ? JSON.parse(stored) : [];
          const merged = [...backendDevices];
          custom.forEach((c: any) => {
            if (!merged.some((m) => m.ip === c.ip || m.name === c.name)) {
              merged.push(c);
            }
          });
          setDynamicTvDevices(merged);
        });
      }
    };

    socket.on('displaysUpdated', handleDisplaysUpdated);
    return () => {
      socket.off('displaysUpdated', handleDisplaysUpdated);
    };
  }, [socket]);

  useEffect(() => {
    if (showCastModal) {
      fetchTvCastInfo();
    }
  }, [showCastModal]);

  const handleAddCustomTv = async () => {
    if (!newTvName.trim() || !newTvIp.trim()) return;
    const newDev = {
      name: newTvName.trim(),
      ip: newTvIp.trim(),
      type: 'Custom Wi-Fi TV',
      isCustom: true,
    };
    try {
      const stored = await AsyncStorage.getItem('custom_tv_devices');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [newDev, ...existing];
      await AsyncStorage.setItem('custom_tv_devices', JSON.stringify(updated));
      setDynamicTvDevices((prev) => [newDev, ...prev]);
      setNewTvName('');
      setNewTvIp('');
      setShowAddTvModal(false);
      Alert.alert(
        isTel ? 'TV జోడించబడింది' : 'Smart TV Added',
        isTel ? `${newDev.name} సరిగ్గా జోడించబడింది.` : `${newDev.name} (${newDev.ip}) successfully added.`
      );
    } catch (e) {}
  };

  const handleOpenTvUrl = () => {
    if (tvCastInfo?.tvWebUrl) {
      Linking.openURL(tvCastInfo.tvWebUrl).catch(() => {
        Alert.alert('Error', `Could not open ${tvCastInfo.tvWebUrl}`);
      });
    }
  };

  const handleCopyTvUrl = () => {
    if (tvCastInfo?.tvWebUrl) {
      try {
        Clipboard.setString(tvCastInfo.tvWebUrl);
        Alert.alert('Copied!', `Smart TV Web URL copied:\n${tvCastInfo.tvWebUrl}`);
      } catch (_) {
        Alert.alert('Smart TV URL', tvCastInfo.tvWebUrl);
      }
    }
  };

  const handleConnectToTv = (dev: any) => {
    const isConn = castingDevice === dev.name;
    if (isConn) {
      setCastingDevice(null);
      Alert.alert('Disconnected', `Disconnected from ${dev.name}`);
    } else {
      setCastingDevice(dev.name);
      if (selectedSong && isLive) {
        startLiveSession(selectedSong, currentSlide);
      }
      Alert.alert(
        'Connected & Casting',
        `Live lyrics stream connected to ${dev.name} (${dev.ip})!`
      );
    }
  };

  const handleStartDeviceScan = () => {
    fetchTvCastInfo();
  };

  // Derived Values
  const activeSlide = selectedSong?.lyrics?.[currentSlide];
  const lyricLines = activeSlide?.text?.split('\n') ?? [];
  const totalSlides = selectedSong?.lyrics?.length ?? 0;
  const filteredSongs = songs.filter((s: SongItem) =>
    !songSearch || s.title.toLowerCase().includes(songSearch.toLowerCase())
  );

  // ───────────────────────────────────────────────────────────────────────────
  // AUDIENCE VIEW (Non-Operators)
  // ───────────────────────────────────────────────────────────────────────────
  if (!isOperator) {
    if (!liveSession) {
      return (
        <View style={styles.audienceEmpty}>
          <StatusBar hidden />
          <TouchableOpacity style={styles.backCircle} onPress={handleSafeBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="wifi-off" size={64} color="#444" />
          <Text style={styles.audienceEmptyTitle}>
            {isTel ? 'లైవ్ ఆరాధన లేదు' : 'No Active Live Stream'}
          </Text>
          <Text style={styles.audienceEmptySub}>
            {isTel ? 'నిర్వాహకులు లైవ్ ప్రారంభించే వరకు వేచి ఉండండి.' : 'Wait for worship leaders to start live stream.'}
          </Text>
        </View>
      );
    }

    const { song, currentSlideIndex: si, blackScreen: bs, blankScreen: bls, highlightedLineIndex: hli } = liveSession;
    const slide = song?.lyrics?.[si ?? 0];
    const lines = slide?.text?.split('\n') ?? [];

    if (bs) return <View style={{ flex: 1, backgroundColor: '#000' }}><StatusBar hidden /></View>;
    if (bls) return <View style={{ flex: 1, backgroundColor: '#fff' }}><StatusBar hidden /></View>;

    return (
      <View style={styles.audienceContainer}>
        <StatusBar hidden />
        <TouchableOpacity style={styles.backCircle} onPress={handleSafeBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        {song && <Text style={styles.audienceSongTitle}>{song.title}</Text>}
        {slide && (
          <View style={styles.audienceTypeBadge}>
            <Text style={styles.audienceTypeText}>{slide.type?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.audienceLyricsArea}>
          {lines.map((line: string, i: number) => {
            if (line.includes('MEDIA_ONLY:') || line.includes('IMAGE_ONLY:') || line.includes('THUMBNAIL_ONLY:')) {
              const imgUri = line.replace(/.*?(MEDIA_ONLY|IMAGE_ONLY|THUMBNAIL_ONLY):\s*/i, '').replace(/\]$/, '').trim();
              return (
                <View key={i} style={{ width: '100%', height: '85%', justifyContent: 'center', alignItems: 'center' }}>
                  <Image source={{ uri: imgUri }} style={{ width: '92%', height: '92%', borderRadius: 16 }} resizeMode="contain" />
                </View>
              );
            }
            return (
              <Text key={i} style={[styles.audienceLine, hli === i && styles.audienceLineHL]}>
                {line}
              </Text>
            );
          })}
        </View>
        <View style={styles.audienceDotsRow}>
          {song?.lyrics?.map((_: any, i: number) => (
            <View key={i} style={[styles.audienceDot, i === (si ?? 0) && styles.audienceDotActive]} />
          ))}
        </View>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OPERATOR VIEW — 1/3 Screen Top (Live Slide), 2/3 Screen Bottom (Verse Cards)
  // ───────────────────────────────────────────────────────────────────────────
  const topH = Math.round(height * 0.33);
  const bottomH = height - topH;

  return (
    <Portal.Host>
      <View style={styles.operatorContainer}>
        <StatusBar hidden />

        {/* ── TOP 1/3 ZONE: Live Current Slide Preview ── */}
        <View style={[styles.operatorTop, { height: topH }, blackScreen && { backgroundColor: '#000' }, blankScreen && { backgroundColor: '#fff' }]}>
          {/* Bar Controls */}
          <View style={styles.opTopBar}>
            <TouchableOpacity onPress={handleSafeBack} style={styles.opTopBtn}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#aaa" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              {isLive ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={styles.liveLabel}>LIVE</Text>
                </View>
              ) : (
                <Text style={styles.standbyLabel}>STANDBY</Text>
              )}
              <Text style={styles.opTopSongName} numberOfLines={1}>
                {selectedSong ? selectedSong.title : (isTel ? 'పాట ఎంచుకోండి' : 'Select a Song')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {/* Share TV Link Button */}
              <TouchableOpacity onPress={handleShareTvLink} style={styles.opTopBtn}>
                <MaterialCommunityIcons name="share-variant-outline" size={18} color="#38bdf8" />
              </TouchableOpacity>

              {/* Cast Button */}
              <TouchableOpacity onPress={() => { setShowCastModal(true); handleStartDeviceScan(); }} style={styles.opTopBtn}>
                <MaterialCommunityIcons name={castingDevice ? 'cast-connected' : 'cast'} size={18} color={castingDevice ? '#6366f1' : '#aaa'} />
              </TouchableOpacity>

              {/* Announcement Note Button */}
              <TouchableOpacity onPress={() => setShowCustomNoteModal(true)} style={styles.opTopBtn}>
                <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#ffd54f" />
              </TouchableOpacity>

              {/* Change Song Button */}
              <TouchableOpacity onPress={() => setShowSongPicker(true)} style={styles.opTopBtn}>
                <MaterialCommunityIcons name="music-box-multiple" size={18} color="#6366f1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notice Active Overlay Banner */}
          {activeNoticeText && (
            <TouchableOpacity onPress={handleClearNotice} style={styles.opNoticeBanner}>
              <MaterialCommunityIcons name="bullhorn" size={16} color="#1a1a1a" />
              <Text style={styles.opNoticeBannerText} numberOfLines={1}>
                {isTel ? `📢 ప్రకటన ప్రసారం: ${activeNoticeText}` : `📢 NOTICE: ${activeNoticeText}`}
              </Text>
              <View style={styles.opNoticeClearChip}>
                <Text style={styles.opNoticeClearText}>{isTel ? 'పునఃప్రారంభించు' : 'Resume Song'}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Slide Text Display */}
          {selectedSong && !blackScreen && !blankScreen ? (
            <View style={styles.opLyricsAreaFullWidth}>
              <View style={styles.opSlideInfo}>
                <TouchableOpacity onPress={() => handleChangeSlide('prev')} disabled={currentSlide === 0} style={{ padding: 2 }}>
                  <MaterialCommunityIcons name="chevron-left" size={18} color={currentSlide === 0 ? '#333' : '#6366f1'} />
                </TouchableOpacity>

                <View style={styles.opSlideBadge}>
                  <Text style={styles.opSlideBadgeText}>{activeSlide?.type?.toUpperCase() || 'VERSE'}</Text>
                </View>
                <Text style={styles.opSlideCounter}>
                  👈 {currentSlide + 1} / {totalSlides} 👉
                </Text>

                <TouchableOpacity onPress={() => handleChangeSlide('next')} disabled={currentSlide === totalSlides - 1} style={{ padding: 2 }}>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={currentSlide === totalSlides - 1 ? '#333' : '#6366f1'} />
                </TouchableOpacity>
              </View>

              <FlatList
                ref={flatListRef}
                data={selectedSong.lyrics || []}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                snapToInterval={width}
                snapToAlignment="center"
                disableIntervalMomentum={true}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                  }, 100);
                }}
                getItemLayout={(_, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                style={{ flex: 1, width: width }}
                renderItem={({ item, index }) => {
                  const lines = item.text?.split('\n') || [];
                  return (
                    <View style={{ width: width, paddingHorizontal: 16, justifyContent: 'center' }}>
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
                        {lines.map((line: string, i: number) => {
                          if (line.includes('MEDIA_ONLY:') || line.includes('IMAGE_ONLY:') || line.includes('THUMBNAIL_ONLY:')) {
                            const imgUri = line.replace(/.*?(MEDIA_ONLY|IMAGE_ONLY|THUMBNAIL_ONLY):\s*/i, '').replace(/\]$/, '').trim();
                            return (
                              <View key={i} style={{ width: '100%', height: 180, justifyContent: 'center', alignItems: 'center' }}>
                                <Image source={{ uri: imgUri }} style={{ width: '90%', height: 170, borderRadius: 12 }} resizeMode="contain" />
                              </View>
                            );
                          }
                          const isHL = currentSlide === index && highlightLine === i;
                          return (
                            <TouchableOpacity
                              key={i}
                              style={[styles.opLineCentered, isHL && styles.opLineHL]}
                              onPress={() => handleHighlight(i)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.opLineTextCentered, isHL && styles.opLineTextHL]}>
                                {line}
                              </Text>
                              {isHL && (
                                <MaterialCommunityIcons name="star" size={14} color="#ffd54f" style={{ marginLeft: 6 }} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                }}
              />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {blackScreen ? (
                <Text style={{ color: '#555', fontSize: 13 }}>⚫ BLACKOUT ACTIVE</Text>
              ) : blankScreen ? (
                <Text style={{ color: '#888', fontSize: 13 }}>⚪ BLANK SCREEN ACTIVE</Text>
              ) : (
                <TouchableOpacity onPress={() => setShowSongPicker(true)} style={{ alignItems: 'center' }}>
                  <MaterialCommunityIcons name="music-note-plus" size={36} color="#6366f1" />
                  <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    {isTel ? 'పాటను ఎంచుకోవడానికి ఇక్కడ నొక్కండి' : 'Tap to select a song'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── BOTTOM 2/3 ZONE: Complete Verse & Slide Cards ── */}
        <View style={[styles.operatorBottom, { height: bottomH }]}>

          {/* Toolbar */}
          <View style={styles.opScreenRow}>
            <TouchableOpacity
              style={[styles.opScreenBtn, !blackScreen && !blankScreen && styles.opScreenBtnNormal]}
              onPress={() => handleScreenState('normal')}
            >
              <MaterialCommunityIcons name="television-play" size={14} color={!blackScreen && !blankScreen ? '#fff' : '#666'} />
              <Text style={[styles.opScreenBtnText, !blackScreen && !blankScreen && { color: '#fff' }]}>
                {isTel ? 'సాధారణ' : 'Normal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opScreenBtn, blankScreen && styles.opScreenBtnBlank]}
              onPress={() => handleScreenState(blankScreen ? 'normal' : 'blank')}
            >
              <MaterialCommunityIcons name="television-off" size={14} color={blankScreen ? '#fff' : '#666'} />
              <Text style={[styles.opScreenBtnText, blankScreen && { color: '#fff' }]}>
                {isTel ? 'ఖాళీ' : 'Blank'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opScreenBtn, blackScreen && styles.opScreenBtnBlack]}
              onPress={() => handleScreenState(blackScreen ? 'normal' : 'black')}
            >
              <MaterialCommunityIcons name="circle-off-outline" size={14} color={blackScreen ? '#fff' : '#666'} />
              <Text style={[styles.opScreenBtnText, blackScreen && { color: '#fff' }]}>
                {isTel ? 'బ్లాక్అవుట్' : 'Blackout'}
              </Text>
            </TouchableOpacity>

            {/* Quick Change Song Button */}
            <TouchableOpacity
              style={styles.changeSongBtn}
              onPress={() => setShowSongPicker(true)}
            >
              <MaterialCommunityIcons name="music-box-outline" size={14} color="#6366f1" />
              <Text style={styles.changeSongBtnText}>
                {isTel ? 'పాట మార్చు' : 'Change Song'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Header title */}
          <View style={styles.opSectionHeader}>
            <Text style={styles.opSectionTitle}>
              {selectedSong ? `📜 ${selectedSong.title} — SLIDES` : (isTel ? 'పాట స్లయిడ్‌లు' : 'VERSE CARDS')}
            </Text>
            {selectedSong && (
              <Text style={{ fontSize: 11, color: '#6366f1', fontWeight: 'bold' }}>
                {selectedSong.lyrics?.length || 0} Slides
              </Text>
            )}
          </View>

          {/* List of Verse Cards for the Selected Song */}
          {selectedSong && selectedSong.lyrics && selectedSong.lyrics.length > 0 ? (
            <ScrollView
              contentContainerStyle={{ padding: 12, paddingBottom: 110, gap: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedSong.lyrics.map((slideItem, index) => {
                const isCurrent = index === currentSlide;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[styles.verseCard, isCurrent && styles.verseCardActive]}
                    onPress={() => handleSelectSlideIndex(index)}
                  >
                    <View style={styles.verseCardHeader}>
                      <View style={[styles.verseTypeChip, isCurrent && { backgroundColor: '#6366f1' }]}>
                        <Text style={[styles.verseTypeChipText, isCurrent && { color: '#fff' }]}>
                          {slideItem.type?.toUpperCase() || `VERSE ${index + 1}`}
                        </Text>
                      </View>

                      {isCurrent ? (
                        <View style={styles.presentingBadge}>
                          <MaterialCommunityIcons name="radio-tower" size={12} color="#fff" />
                          <Text style={styles.presentingBadgeText}>
                            {isTel ? 'ప్రసారంలో ఉంది' : 'PRESENTING'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.verseIndexText}>#{index + 1}</Text>
                      )}
                    </View>

                    <Text style={[styles.verseCardBody, isCurrent && styles.verseCardBodyActive]}>
                      {slideItem.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <MaterialCommunityIcons name="playlist-music" size={48} color="#ccc" />
              <Text style={{ color: '#888', marginTop: 12, fontSize: 14, textAlign: 'center' }}>
                {isTel ? 'పాటను ఎంచుకోవడానికి పైభాగంలో ఉన్న బటన్ నొక్కండి.' : 'Select a song to view and control its verse cards.'}
              </Text>
              <Button
                mode="contained"
                onPress={() => setShowSongPicker(true)}
                buttonColor="#6366f1"
                style={{ marginTop: 16, borderRadius: 10 }}
              >
                {isTel ? 'పాటల జాబితా తెరవండి' : 'Open Songs List'}
              </Button>
            </View>
          )}

          {/* Bottom Action Bar */}
          <View style={styles.opActionBar}>
            {isLive ? (
              <>
                <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
                  <MaterialCommunityIcons name="stop-circle" size={18} color="#fff" />
                  <Text style={styles.endBtnText}>{isTel ? 'ముగించు' : 'End Live'}</Text>
                </TouchableOpacity>
                <View style={styles.liveChip}>
                  <Animated.View style={[styles.liveDotSmall, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={styles.liveChipText}>LIVE</Text>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.goLiveBtn, !selectedSong && { opacity: 0.5 }]}
                disabled={!selectedSong}
                onPress={handleGoLive}
              >
                <MaterialCommunityIcons name="broadcast" size={20} color="#fff" />
                <Text style={styles.goLiveBtnText}>
                  {isTel ? 'లైవ్‌కి వెళ్ళు' : 'Go Live Presentation'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </View>

        {/* ── MODAL 1: Song Picker ── */}
        <Portal>
          <Modal
            visible={showSongPicker}
            onDismiss={() => setShowSongPicker(false)}
            contentContainerStyle={styles.pickerModal}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                🎵 {isTel ? 'పాటను ఎంచుకోండి' : 'Select Song to Present'}
              </Text>
              <TouchableOpacity onPress={() => setShowSongPicker(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchRow}>
              <MaterialCommunityIcons name="magnify" size={18} color="#888" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={isTel ? 'పాటలను శోధించండి...' : 'Search song by title...'}
                placeholderTextColor="#999"
                value={songSearch}
                onChangeText={setSongSearch}
              />
              {songSearch.length > 0 && (
                <TouchableOpacity onPress={() => setSongSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredSongs}
              keyExtractor={(item) => item._id || item.id || item.title}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const isActive = selectedSong && ((selectedSong._id || selectedSong.id) === (item._id || item.id));
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                    onPress={() => handleSelectSong(item)}
                  >
                    <MaterialCommunityIcons
                      name={isActive ? 'radio-tower' : 'music-note'}
                      size={20}
                      color={isActive ? '#6366f1' : '#888'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.pickerItemTitle, isActive && { color: '#6366f1', fontWeight: 'bold' }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.pickerItemSub}>
                        {item.language} • {item.category}
                      </Text>
                    </View>
                    {isActive && <MaterialCommunityIcons name="check" size={20} color="#6366f1" />}
                  </TouchableOpacity>
                );
              }}
            />
          </Modal>
        </Portal>

        {/* ── MODAL 2: Custom Note / Announcement ── */}
        <Portal>
          <Modal
            visible={showCustomNoteModal}
            onDismiss={() => setShowCustomNoteModal(false)}
            contentContainerStyle={styles.noteModal}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                📢 {isTel ? 'ప్రకటనను స్క్రీన్‌పై ప్రదర్శించండి' : 'Broadcast Announcement on Screen'}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomNoteModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              {isTel
                ? 'టీవీ మరియు ప్రేక్షకుల స్క్రీన్‌పై ప్రదర్శించడానికి ఏదైనా ప్రకటన లేదా ప్రీసెట్‌ను ఎంచుకోండి.'
                : 'Click any preset or church announcement below to instantly display it on TV & audience screens.'}
            </Text>

            {/* Quick Presets - Direct Broadcast on Tap */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366f1', marginBottom: 6 }}>
              ⚡ QUICK PRESETS (CLICK TO DISPLAY)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ANNOUNCEMENT_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetChip}
                    onPress={() => handleBroadcastAnnouncement(preset.text, isTel ? preset.titleTel : preset.titleEng)}
                  >
                    <MaterialCommunityIcons name={preset.icon as any} size={14} color="#6366f1" />
                    <Text style={styles.presetChipText}>
                      {isTel ? preset.titleTel : preset.titleEng}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Live Church Notices List */}
            {notices && notices.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366f1', marginBottom: 6 }}>
                  📜 CHURCH BULLETIN ANNOUNCEMENTS (CLICK TO BROADCAST)
                </Text>
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 6 }}>
                    {notices.map((n, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.noticeBroadcastItem}
                        onPress={() => handleBroadcastAnnouncement(n.description, n.title)}
                      >
                        <MaterialCommunityIcons name="bullhorn" size={16} color="#6366f1" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e293b' }} numberOfLines={1}>
                            {n.title}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>
                            {n.description}
                          </Text>
                        </View>
                        <View style={styles.displayBadge}>
                          <Text style={styles.displayBadgeText}>{isTel ? 'ప్రదర్శించు' : 'DISPLAY'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Custom Message Input */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366f1', marginBottom: 4 }}>
              ✏️ CUSTOM MESSAGE
            </Text>
            <TextInput
              style={styles.customNoteInput}
              placeholder={isTel ? 'ఇక్కడ సందేశం టైప్ చేయండి...' : 'Type custom note or announcement here...'}
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              value={customNoteText}
              onChangeText={setCustomNoteText}
              textAlignVertical="top"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button
                mode="outlined"
                onPress={() => setShowCustomNoteModal(false)}
                style={{ flex: 1, borderRadius: 8 }}
              >
                {isTel ? 'రద్దు' : 'Cancel'}
              </Button>
              <Button
                mode="contained"
                buttonColor="#ffd54f"
                textColor="#1a1a1a"
                onPress={() => handleBroadcastAnnouncement(customNoteText)}
                disabled={!customNoteText.trim()}
                style={{ flex: 1, borderRadius: 8 }}
              >
                {isTel ? 'ప్రసారం చేయి' : 'Broadcast Note'}
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* ── MODAL 3: Cast to Smart TV ── */}
        <Portal>
          <Modal
            visible={showCastModal}
            onDismiss={() => setShowCastModal(false)}
            contentContainerStyle={styles.castModal}
          >
            <View style={styles.pickerModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="cast" size={22} color="#6366f1" />
                <Text style={styles.pickerModalTitle}>
                  {isTel ? 'TVకి కనెక్ట్ చేయండి (Smart TV Cast)' : 'Cast to Android / Smart TV'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCastModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* TV Pairing & Server URL Card */}
            {tvCastInfo?.tvWebUrl && (
              <View style={styles.tvUrlCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366f1' }}>
                    📺 SMART TV PLAYER WEB URL
                  </Text>
                  {tvCastInfo.pairingCode && (
                    <View style={styles.pairCodeChip}>
                      <Text style={styles.pairCodeText}>{tvCastInfo.pairingCode}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tvUrlText} numberOfLines={1}>
                  {tvCastInfo.tvWebUrl}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity style={styles.tvUrlBtn} onPress={handleCopyTvUrl}>
                    <MaterialCommunityIcons name="content-copy" size={14} color="#6366f1" />
                    <Text style={styles.tvUrlBtnText}>{isTel ? 'లింక్ కాపీ చేయి' : 'Copy Link'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tvUrlBtn, { backgroundColor: '#6366f1' }]} onPress={handleOpenTvUrl}>
                    <MaterialCommunityIcons name="open-in-new" size={14} color="#fff" />
                    <Text style={[styles.tvUrlBtnText, { color: '#fff' }]}>{isTel ? 'TV బ్రౌజర్‌లో తెరువు' : 'Open TV Player'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={{ fontSize: 12, color: '#666', marginBottom: 10, marginTop: 4 }}>
              {isTel
                ? 'ఏదైనా స్మార్ట్ టీవీ బ్రౌజర్‌లో పైన ఉన్న URLని తెరవండి లేదా క్రింద ఉన్న పరికరాన్ని ఎంచుకోండి.'
                : 'Open the URL on any Smart TV browser (LG webOS, Samsung, Android TV) or connect to active screens below.'}
            </Text>

            {isSearchingDevices ? (
              <View style={{ padding: 20, alignItems: 'center', gap: 10 }}>
                <MaterialCommunityIcons name="radar" size={32} color="#6366f1" />
                <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: 'bold' }}>
                  {isTel ? 'నెట్‌వర్క్ TVల కోసం శోధిస్తోంది...' : 'Fetching dynamic TV displays & scanning network...'}
                </Text>
              </View>
            ) : dynamicTvDevices.length > 0 ? (
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {dynamicTvDevices.map((dev, i) => {
                    const isConn = castingDevice === dev.name;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.castDeviceRow, isConn && styles.castDeviceRowConnected]}
                        onPress={() => handleConnectToTv(dev)}
                      >
                        <MaterialCommunityIcons name="television" size={24} color={isConn ? '#4caf50' : '#555'} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.castDeviceName, isConn && { color: '#4caf50', fontWeight: 'bold' }]}>
                            {dev.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#888' }}>
                            {dev.type} • {dev.ip} {dev.connectedAt ? `• Connected ${dev.connectedAt}` : ''}
                          </Text>
                        </View>
                        {isConn ? (
                          <View style={styles.connectedChip}>
                            <Text style={styles.connectedChipText}>CASTING</Text>
                          </View>
                        ) : (
                          <MaterialCommunityIcons name="broadcast" size={18} color="#6366f1" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, marginBottom: 12 }}>
                <MaterialCommunityIcons name="television-off" size={28} color="#94a3b8" />
                <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6 }}>
                  {isTel ? 'కనెక్ట్ చేసిన TVలు ఏవీ కనుగొనబడలేదు. మీ TV బ్రౌజర్‌లో పైన ఉన్న లింక్‌ను తెరవండి.' : 'No active TV displays detected yet. Open the URL above on any TV browser or add TV IP manually below.'}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button
                mode="outlined"
                onPress={handleStartDeviceScan}
                icon="refresh"
                style={{ flex: 1, borderRadius: 8 }}
              >
                {isTel ? 'రిఫ్రెష్' : 'Rescan Network'}
              </Button>

              <Button
                mode="contained"
                buttonColor="#6366f1"
                onPress={() => {
                  setShowCastModal(false);
                  setTimeout(() => setShowAddTvModal(true), 150);
                }}
                icon="plus"
                style={{ flex: 1, borderRadius: 8 }}
              >
                {isTel ? 'TV జోడించు' : 'Add TV IP'}
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* ── MODAL 4: Add Custom TV IP ── */}
        <Portal>
          <Modal
            visible={showAddTvModal}
            onDismiss={() => setShowAddTvModal(false)}
            contentContainerStyle={styles.castModal}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                📺 {isTel ? 'కస్టమ్ TV IP జోడించండి' : 'Add Custom Smart TV IP'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddTvModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              {isTel
                ? 'మీ స్మార్ట్ టీవీ పేరు మరియు Wi-Fi IP చిరునామాను ఇక్కడ నమోదు చేయండి.'
                : 'Enter your Smart TV device name and IP address on the local Wi-Fi network.'}
            </Text>

            <TextInput
              style={[styles.customNoteInput, { minHeight: 40, marginBottom: 10 }]}
              placeholder={isTel ? 'TV పేరు (ఉదా: Altar TV)' : 'Device Name (e.g. Stage TV)'}
              placeholderTextColor="#aaa"
              value={newTvName}
              onChangeText={setNewTvName}
            />

            <TextInput
              style={[styles.customNoteInput, { minHeight: 40, marginBottom: 14 }]}
              placeholder={isTel ? 'IP చిరునామా (ఉదా: 192.168.1.105)' : 'IP Address (e.g. 192.168.1.105)'}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={newTvIp}
              onChangeText={setNewTvIp}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                mode="outlined"
                onPress={() => setShowAddTvModal(false)}
                style={{ flex: 1, borderRadius: 8 }}
              >
                {isTel ? 'రద్దు' : 'Cancel'}
              </Button>
              <Button
                mode="contained"
                buttonColor="#6366f1"
                onPress={handleAddCustomTv}
                disabled={!newTvName.trim() || !newTvIp.trim()}
                style={{ flex: 1, borderRadius: 8 }}
              >
                {isTel ? 'రక్షించు' : 'Save TV Device'}
              </Button>
            </View>
          </Modal>
        </Portal>

      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  // ── Audience ─────────────────────────────────────────────────────────────
  audienceEmpty: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  audienceEmptyTitle: { color: '#ccc', fontSize: 20, fontWeight: 'bold' },
  audienceEmptySub: { color: '#666', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  backCircle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 20,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  audienceContainer: {
    flex: 1,
    backgroundColor: '#09090f',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  audienceSongTitle: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 },
  audienceTypeBadge: { backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  audienceTypeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 },
  audienceLyricsArea: { alignItems: 'center', gap: 10, maxWidth: 500 },
  audienceLine: { color: '#ccccdd', fontSize: 24, lineHeight: 36, textAlign: 'center' },
  audienceLineHL: { color: '#ffd54f', fontWeight: 'bold', fontSize: 28 },
  audienceDotsRow: { flexDirection: 'row', gap: 8, marginTop: 28 },
  audienceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2a45' },
  audienceDotActive: { backgroundColor: '#6366f1', width: 22, borderRadius: 4 },

  // ── Operator UI ────────────────────────────────────────────────────────────
  operatorContainer: { flex: 1, backgroundColor: '#0a0a1a' },
  operatorTop: { backgroundColor: '#0d0d20', borderBottomWidth: 1, borderBottomColor: '#1a1a35' },
  opTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 10,
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a35',
  },
  opTopBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },
  opTopSongName: { color: '#e0e0ff', fontWeight: 'bold', fontSize: 13, marginTop: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f44336' },
  liveDotSmall: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#f44336' },
  liveLabel: { color: '#f44336', fontWeight: 'bold', fontSize: 11, letterSpacing: 2 },
  standbyLabel: { color: '#ffb300', fontWeight: 'bold', fontSize: 10, letterSpacing: 2 },
  opLyricsArea: { flex: 1, paddingHorizontal: 12, paddingTop: 4 },
  opLyricsAreaFullWidth: { flex: 1, paddingTop: 4 },
  opSlideInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, paddingHorizontal: 12 },
  opSlideBadge: { backgroundColor: '#6366f1', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  opSlideBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  opSlideCounter: { color: '#888', fontSize: 11, fontWeight: '600' },
  opLine: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingHorizontal: 8,
    borderRadius: 6, gap: 8, marginBottom: 2,
    backgroundColor: '#13132a',
  },
  opLineCentered: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, gap: 6, marginBottom: 4,
    backgroundColor: '#13132a',
  },
  opLineHL: { backgroundColor: 'rgba(255,213,79,0.15)', borderWidth: 1, borderColor: 'rgba(255,213,79,0.4)' },
  opLineBar: { width: 3, height: 16, borderRadius: 2, backgroundColor: '#2a2a45' },
  opLineText: { color: '#aaaacc', fontSize: 14, flex: 1, lineHeight: 19 },
  opLineTextCentered: { color: '#e0e0ff', fontSize: 15, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  opLineTextHL: { color: '#ffd54f', fontWeight: 'bold' },

  // Notice Overlay Banner
  opNoticeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffd54f', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, marginHorizontal: 12, marginBottom: 6,
  },
  opNoticeBannerText: { flex: 1, color: '#1a1a1a', fontWeight: 'bold', fontSize: 12 },
  opNoticeClearChip: { backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  opNoticeClearText: { color: '#ffd54f', fontSize: 10, fontWeight: 'bold' },

  // Bottom 2/3 Area
  operatorBottom: { backgroundColor: '#f5f6fb', flex: 1 },
  opScreenRow: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 12,
    paddingVertical: 8, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
    alignItems: 'center',
  },
  opScreenBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#f1f1f5', borderWidth: 1, borderColor: '#e5e5ea',
  },
  opScreenBtnNormal: { backgroundColor: '#2e7d32', borderColor: '#388e3c' },
  opScreenBtnBlank: { backgroundColor: '#e65100', borderColor: '#f57c00' },
  opScreenBtnBlack: { backgroundColor: '#37474f', borderColor: '#546e7a' },
  opScreenBtnText: { fontSize: 11, color: '#666', fontWeight: '600' },
  changeSongBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#c7d2fe',
  },
  changeSongBtnText: { color: '#6366f1', fontSize: 11, fontWeight: 'bold' },
  opSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#f9fafc', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  opSectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Verse Cards
  verseCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0', elevation: 1,
  },
  verseCardActive: {
    backgroundColor: '#fafbff', borderColor: '#6366f1', borderWidth: 2, elevation: 3,
  },
  verseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  verseTypeChip: { backgroundColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  verseTypeChipText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
  verseIndexText: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  presentingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366f1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  presentingBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  verseCardBody: { fontSize: 14, color: '#334155', lineHeight: 22 },
  verseCardBodyActive: { color: '#0f172a', fontWeight: '500' },

  // Action Bar
  opActionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    elevation: 8,
  },
  goLiveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, backgroundColor: '#dc2626',
    borderRadius: 12, paddingVertical: 12,
  },
  goLiveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  endBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, backgroundColor: '#7f1d1d',
    borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#991b1b',
  },
  endBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a0000', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#f44336',
  },
  liveChipText: { color: '#f44336', fontWeight: 'bold', fontSize: 11, letterSpacing: 1.5 },

  // Modals
  pickerModal: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16 },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pickerModalTitle: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  pickerSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: '#1f2937' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemActive: { backgroundColor: '#eef2ff' },
  pickerItemTitle: { fontSize: 14, color: '#1f2937' },
  pickerItemSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  noteModal: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16 },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  presetChipText: { fontSize: 11, color: '#4338ca', fontWeight: '600' },
  customNoteInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    padding: 10, backgroundColor: '#f9fafb', fontSize: 14, minHeight: 90,
  },

  castModal: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16 },
  tvUrlCard: {
    backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ddd6fe', marginBottom: 8,
  },
  pairCodeChip: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  pairCodeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tvUrlText: { fontSize: 12, color: '#4338ca', fontWeight: 'bold' },
  tvUrlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, backgroundColor: '#ede9fe', borderWidth: 1, borderColor: '#c7d2fe',
  },
  tvUrlBtnText: { fontSize: 11, color: '#4338ca', fontWeight: '600' },
  castDeviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  castDeviceRowConnected: { backgroundColor: '#f0fdf4', borderColor: '#4caf50' },
  castDeviceName: { fontSize: 14, color: '#1e293b' },
  connectedChip: { backgroundColor: '#4caf50', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  connectedChipText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  noticeBroadcastItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  displayBadge: { backgroundColor: '#6366f1', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  displayBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});
