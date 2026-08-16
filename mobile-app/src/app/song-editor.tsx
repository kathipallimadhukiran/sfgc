import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, ScrollView, Platform, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, StatusBar
} from 'react-native';
import { Text, Button, IconButton, ActivityIndicator, Portal, Modal } from 'react-native-paper';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { songsService } from '@/services/songsService';

const CATEGORIES = [
  'Worship', 'Praise', 'Prayer', 'Christmas', 'Easter', 'Youth',
  'Special Songs', 'Telugu', 'English', 'Good Friday', 'Offering',
  'Healing Prayer', 'Fasting Prayer', 'Revival', 'Communion', 'Baptism'
];

export default function SongEditorScreen() {
  const { editId, returnTo } = useLocalSearchParams<{ editId?: string; returnTo?: string }>();
  const { songs, refreshData, language } = useApp();
  const isTel = language === 'Telugu';
  const router = useRouter();
  const theme = useTheme();

  const handleGoBack = () => {
    if (returnTo) {
      router.replace(returnTo as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/songs');
    }
  };

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [userHasEditedTitle, setUserHasEditedTitle] = useState(false);
  const [lang, setLang] = useState<'Telugu' | 'English'>('Telugu');
  const [category, setCategory] = useState('Worship');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [youtubeLink, setYoutubeLink] = useState('');
  const [chords, setChords] = useState('');
  const [lyrics, setLyrics] = useState('');

  // Selection tracking for TextInput insertion
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const lyricsInputRef = useRef<TextInput>(null);

  const resetForm = () => {
    setTitle('');
    setUserHasEditedTitle(false);
    setLang('Telugu');
    setCategory('Worship');
    setYoutubeLink('');
    setChords('');
    setLyrics('');
  };

  useEffect(() => {
    if (editId) {
      setLoading(true);
      (async () => {
        try {
          const res = await songsService.getSongById(editId as string);
          if (res && res.success && res.song) {
            populateForm(res.song);
          } else {
            const cached = songs.find((s: any) => (s._id || s.id) === editId);
            if (cached) populateForm(cached);
          }
        } catch (e) {
          const cached = songs.find((s: any) => (s._id || s.id) === editId);
          if (cached) populateForm(cached);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      resetForm();
    }
  }, [editId]);

  const populateForm = (songData: any) => {
    setTitle(songData.title || '');
    setUserHasEditedTitle(true); // Don't overwrite existing title automatically
    setLang(songData.language || 'Telugu');
    setCategory(songData.category || 'Worship');
    setYoutubeLink(songData.youtubeLink || '');
    setChords(songData.chords || '');

    // Format lyrics from slides back to text with section headers
    if (Array.isArray(songData.lyrics)) {
      const textVal = songData.lyrics.map((s: any) => {
        const typeStr = s.type ? `[${s.type}]\n` : '';
        return `${typeStr}${s.text || ''}`;
      }).join('\n\n');
      setLyrics(textVal);
    } else {
      setLyrics(songData.lyrics || '');
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

  // Handle Lyrics Change & Auto-extract Song Title from 1st line if user hasn't typed custom title
  const handleLyricsChange = (text: string) => {
    setLyrics(text);

    if (!userHasEditedTitle) {
      // Find first non-empty line that isn't a bracket tag
      const lines = text.split('\n');
      let firstLine = '';
      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (trimmed && !trimmed.startsWith('[') && !trimmed.endsWith(']')) {
          firstLine = trimmed;
          break;
        }
      }

      if (firstLine) {
        // Clean prefixes if present (e.g., "chorus:", "1.")
        const cleanTitle = firstLine.replace(/^(chorus|bridge|verse\s*\d*|intro|outro):?\s*/i, '').trim();
        if (cleanTitle) {
          setTitle(cleanTitle);
        }
      }
    }
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setUserHasEditedTitle(text.trim().length > 0);
  };

  // Insert Quick Section Header safely at cursor position
  const handleInsertSectionHeader = (sectionName: string) => {
    const { start, end } = selectionRef.current;
    const headerText = `[${sectionName}]\n`;
    
    let updated = '';
    let newCursorPos = start + headerText.length;

    if (start === 0 && end === 0) {
      if (lyrics.length === 0) {
        updated = headerText;
      } else {
        updated = `${headerText}\n${lyrics}`;
      }
    } else {
      const before = lyrics.substring(0, start);
      const after = lyrics.substring(end);
      const prefixNeeded = (before.length > 0 && !before.endsWith('\n\n') && !before.endsWith('\n')) ? '\n\n' : '';
      const finalInsert = `${prefixNeeded}${headerText}`;
      updated = before + finalInsert + after;
      newCursorPos = start + finalInsert.length;
    }

    setLyrics(updated);
    
    // Update cursor position smoothly
    setTimeout(() => {
      lyricsInputRef.current?.setNativeProps({
        selection: { start: newCursorPos, end: newCursorPos }
      });
    }, 50);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !lyrics.trim()) {
      Alert.alert(
        isTel ? 'వివరాలు కొరవడ్డాయి' : 'Missing Fields',
        isTel ? 'దయచేసి పాట శీర్షిక మరియు సాహిత్యాన్ని నమోదు చేయండి.' : 'Please enter a Song Title and Lyrics.'
      );
      return;
    }

    setSubmitting(true);
    try {
      // Split lyrics into slide blocks
      const rawBlocks = lyrics.split(/\n\s*\n+/).map(b => b.trim()).filter(b => b.length > 0);
      let verseCount = 0;
      const slides = rawBlocks.map(block => {
        let type = 'Verse';
        let text = block;

        const headerMatch = block.match(/^\[([^\]]+)\]\s*\n?/);
        if (headerMatch && headerMatch[1]) {
          type = headerMatch[1].trim();
          text = block.replace(/^\[([^\]]+)\]\s*\n?/, '').trim();
        } else {
          const lc = block.toLowerCase();
          if (lc.startsWith('chorus:')) {
            type = 'Chorus'; text = block.replace(/^chorus:?\s*/i, '').trim();
          } else if (lc.startsWith('bridge:')) {
            type = 'Bridge'; text = block.replace(/^bridge:?\s*/i, '').trim();
          } else if (lc.startsWith('pre-chorus:') || lc.startsWith('prechorus:')) {
            type = 'Pre-Chorus'; text = block.replace(/^pre-?chorus:?\s*/i, '').trim();
          } else if (lc.startsWith('outro:')) {
            type = 'Outro'; text = block.replace(/^outro:?\s*/i, '').trim();
          } else if (lc.startsWith('intro:')) {
            type = 'Intro'; text = block.replace(/^intro:?\s*/i, '').trim();
          } else {
            verseCount++;
            type = `Verse ${verseCount}`;
          }
        }
        return { type, text };
      }).filter(s => s.text.length > 0);

      const payload = {
        title: title.trim(),
        language: lang,
        category,
        youtubeLink: youtubeLink.trim(),
        chords: chords.trim(),
        lyrics: slides,
        tags: [lang.toLowerCase(), category.toLowerCase()]
      };

      let response;
      if (editId) {
        response = await songsService.updateSong(editId, payload);
      } else {
        response = await songsService.addSong(payload);
      }

      if (response && response.success) {
        await refreshData();
        Alert.alert(
          isTel ? 'విజయం! 🎉' : 'Success! 🎉',
          isTel ? 'పాట విజయవంతంగా సేవ్ చేయబడింది.' : 'Song saved successfully.'
        );
        handleGoBack();
      } else {
        Alert.alert('Error', response?.message || 'Failed to save song.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textSecondary }}>
          {isTel ? 'పాట వివరాలు లోడ్ అవుతున్నాయి...' : 'Loading song details...'}
        </Text>
      </View>
    );
  }

  // Parse raw blocks for slide preview
  const rawBlocks = lyrics.split(/\n\s*\n+/).map(b => b.trim()).filter(b => b.length > 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Screen Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {editId ? (isTel ? 'పాట సవరించు' : 'Edit Song') : (isTel ? 'కొత్త పాట జోడించు' : 'Add New Song')}
        </Text>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          buttonColor={theme.primary}
          style={{ borderRadius: 8 }}
          labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
        >
          {submitting ? (isTel ? 'సేవ్...' : 'Saving...') : (isTel ? 'సేవ్ చేయి' : 'Save')}
        </Button>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Song Title (Auto-suggested from 1st line, editable) */}
        <Text style={styles.inputLabel}>{isTel ? 'పాట శీర్షిక *' : 'Song Title *'}</Text>
        <TextInput
          placeholder={isTel ? 'ఉదా: హోసన్నా ఉన్నతమైన స్థలములలో' : 'e.g., Hosanna in the Highest'}
          placeholderTextColor="#aaa"
          value={title}
          onChangeText={handleTitleChange}
          style={[styles.textInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
        />
        {lyrics.length > 0 && !userHasEditedTitle && (
          <Text style={{ fontSize: 11, color: theme.primary, marginTop: 4, fontStyle: 'italic' }}>
            💡 {isTel ? 'సాహిత్యం 1వ పంక్తి నుండి శీర్షిక ఎంచుకోబడింది. అవసరమైతే మార్చవచ్చు.' : 'Title auto-suggested from 1st line of lyrics. Tap to edit.'}
          </Text>
        )}

        {/* Language Selection */}
        <Text style={styles.inputLabel}>{isTel ? 'భాష' : 'Language'}</Text>
        <View style={styles.rowSelector}>
          {(['Telugu', 'English'] as const).map(l => (
            <TouchableOpacity
              key={l}
              style={[
                styles.selectorChip,
                { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                lang === l && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setLang(l)}
            >
              <Text style={[styles.selectorChipText, { color: theme.text }, lang === l && { color: '#ffffff', fontWeight: 'bold' }]}>
                {l === 'Telugu' ? (isTel ? 'తెలుగు' : 'Telugu') : (isTel ? 'ఇంగ్లీష్' : 'English')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Selection Dropdown */}
        <Text style={styles.inputLabel}>{isTel ? 'వర్గం *' : 'Category *'}</Text>
        <TouchableOpacity
          style={[
            styles.textInput,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.cardBorder,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          ]}
          onPress={() => setCategoryModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 15, color: theme.text, fontWeight: '600' }}>
            {getTranslatedCategory(category)}
          </Text>
          <MaterialCommunityIcons name="menu-down" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* YouTube Link */}
        <Text style={styles.inputLabel}>{isTel ? 'యూట్యూబ్ లింక్ (ఐచ్ఛికం)' : 'YouTube Link (Optional)'}</Text>
        <TextInput
          placeholder="https://youtube.com/watch?v=..."
          placeholderTextColor="#aaa"
          value={youtubeLink}
          onChangeText={setYoutubeLink}
          style={[styles.textInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Guitar Chords */}
        <Text style={styles.inputLabel}>{isTel ? 'గిటార్ కోర్డులు (ఐచ్ఛికం)' : 'Guitar Chords (Optional)'}</Text>
        <TextInput
          placeholder="G   C   D   Em  ..."
          placeholderTextColor="#aaa"
          value={chords}
          onChangeText={setChords}
          multiline
          style={[styles.textInput, styles.chordsInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
        />

        {/* Lyrics Area Header & Slide Counter */}
        <View style={styles.lyricsLabelRow}>
          <Text style={styles.inputLabel}>{isTel ? 'సాహిత్యం *' : 'Lyrics *'}</Text>
          {rawBlocks.length > 0 && (
            <View style={[styles.slideCountBadge, { backgroundColor: theme.primary + '18' }]}>
              <MaterialCommunityIcons name="layers" size={14} color={theme.primary} />
              <Text style={[styles.slideCountText, { color: theme.primary }]}>
                {rawBlocks.length} {isTel ? 'స్లయిడ్లు' : rawBlocks.length === 1 ? 'slide' : 'slides'}
              </Text>
            </View>
          )}
        </View>

        {/* Instruction box */}
        <View style={[styles.lyricsHintBox, { backgroundColor: theme.primary + '12' }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={theme.primary} style={{ marginTop: 1 }} />
          <Text style={[styles.lyricsHintText, { color: theme.primary }]}>
            {isTel
              ? 'ప్రతి వర్సు/కోరస్ మధ్య 2 సార్లు Enter నొక్కండి — ఒక్కో విభాగం ఒక స్లయిడ్ అవుతుంది.\nక్రింది Quick Section Header బటన్లను ఉపయోగించండి.'
              : 'Press Enter twice between sections — each block becomes one slide.\nUse the Quick Section Header buttons below.'}
          </Text>
        </View>

        {/* Quick Section Headers */}
        <Text style={[styles.inputLabel, { marginTop: 6 }]}>{isTel ? 'త్వరిత విభాగాలు (Quick Section Headers):' : 'Quick Section Headers:'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['Verse 1', 'Verse 2', 'Verse 3', 'Chorus', 'Bridge', 'Pre-Chorus', 'Intro', 'Outro'].map((sec) => (
              <TouchableOpacity
                key={sec}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 14,
                  backgroundColor: theme.primary + '18',
                  borderWidth: 1,
                  borderColor: theme.primary + '40',
                }}
                onPress={() => handleInsertSectionHeader(sec)}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary }}>
                  + [{sec}]
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Lyrics Textarea */}
        <TextInput
          ref={lyricsInputRef}
          placeholder={
            isTel
              ? '[Verse 1]\nనా జీవమైన యేసయ్యా\nనిన్నే నేను కొలిచెదను\n\n[Chorus]\nహోసన్నా హోసన్నా\nరాజుల రాజువు నీవే'
              : '[Verse 1]\nLine 1 of verse 1\nLine 2 of verse 1\n\n[Chorus]\nHosanna in the highest\nGlory to Jesus'
          }
          placeholderTextColor="#aaa"
          value={lyrics}
          onChangeText={handleLyricsChange}
          onSelectionChange={(e) => {
            selectionRef.current = e.nativeEvent.selection;
          }}
          multiline={true}
          numberOfLines={12}
          style={[styles.lyricsTextarea, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.primary }]}
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="sentences"
          selectionColor={theme.primary}
        />

        {/* MOVED DOWN: Live Slide Preview cards at bottom */}
        {rawBlocks.length > 0 && (
          <View style={[styles.slidePreviewBox, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.slidePreviewTitleRow, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
              <MaterialCommunityIcons name="television-play" size={16} color={theme.primary} />
              <Text style={[styles.slidePreviewTitle, { color: theme.text }]}>
                {isTel ? '📋 లైవ్ స్లయిడ్ల ప్రివ్యూ' : '📋 Live Slide Preview'}
              </Text>
            </View>

            {rawBlocks.map((block: string, i: number) => {
              let label = `Verse ${i + 1}`;
              let displayText = block;

              const headerMatch = block.match(/^\[([^\]]+)\]\s*\n?/);
              if (headerMatch && headerMatch[1]) {
                label = headerMatch[1].trim();
                displayText = block.replace(/^\[([^\]]+)\]\s*\n?/, '').trim();
              } else {
                const lc = block.toLowerCase();
                if (lc.startsWith('chorus:')) { label = 'Chorus'; displayText = block.replace(/^chorus:?\s*/i, ''); }
                else if (lc.startsWith('bridge:')) { label = 'Bridge'; displayText = block.replace(/^bridge:?\s*/i, ''); }
                else if (lc.startsWith('pre-chorus:') || lc.startsWith('prechorus:')) { label = 'Pre-Chorus'; displayText = block.replace(/^pre-?chorus:?\s*/i, ''); }
                else if (lc.startsWith('outro:')) { label = 'Outro'; displayText = block.replace(/^outro:?\s*/i, ''); }
                else if (lc.startsWith('intro:')) { label = 'Intro'; displayText = block.replace(/^intro:?\s*/i, ''); }
              }

              return (
                <View key={i} style={[styles.slidePreviewItem, { borderBottomColor: theme.cardBorder }]}>
                  <View style={styles.slidePreviewHeader}>
                    <View style={[
                      styles.slidePreviewBadge,
                      { backgroundColor: label.toLowerCase().includes('chorus') ? '#ec4899' : (label.toLowerCase().includes('bridge') ? '#8b5cf6' : theme.primary) }
                    ]}>
                      <Text style={styles.slidePreviewBadgeText}>{label.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.slidePreviewIndex, { color: theme.textSecondary }]}>Slide #{i + 1}</Text>
                  </View>
                  <Text style={[styles.slidePreviewText, { color: theme.text }]} numberOfLines={4}>
                    {displayText.trim()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Category Selection Modal */}
      <Portal>
        <Modal
          visible={categoryModalVisible}
          onDismiss={() => setCategoryModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: theme.backgroundElement,
            margin: 20,
            borderRadius: 16,
            padding: 18,
            maxHeight: '75%',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary }}>
              {isTel ? 'పాట వర్గం ఎంచుకోండి' : 'Select Song Category'}
            </Text>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.cardBorder,
                  borderRadius: 8,
                  backgroundColor: category === cat ? theme.primary + '15' : 'transparent',
                }}
                onPress={() => {
                  setCategory(cat);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 15, color: category === cat ? theme.primary : theme.text, fontWeight: category === cat ? 'bold' : 'normal' }}>
                  {getTranslatedCategory(cat)}
                </Text>
                {category === cat && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollContent: {
    padding: 16,
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
  },
  chordsInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    height: 80,
    textAlignVertical: 'top',
  },
  rowSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorChipText: {
    fontSize: 13,
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
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  lyricsHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  lyricsTextarea: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 24,
    minHeight: 220,
  },
  slidePreviewBox: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slidePreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  slidePreviewTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slidePreviewItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  slidePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  slidePreviewBadge: {
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
    fontWeight: '600',
  },
  slidePreviewText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
