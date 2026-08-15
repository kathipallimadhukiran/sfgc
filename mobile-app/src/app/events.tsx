import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, View, RefreshControl, Platform, Alert, Share, TextInput, TouchableOpacity, Image, Switch } from 'react-native';
import { Card, Title, Paragraph, Button, Text, Avatar, Chip, Badge, Divider, Portal, Modal, FAB, IconButton } from 'react-native-paper';
import { useApp } from '@/context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventsService } from '@/services/eventsService';
import { useTheme } from '@/hooks/use-theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Paths, File as FSFile } from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';

export default function EventsScreen() {
  const { events, refreshData, loading, user, token, language } = useApp();
  const isTel = language === 'Telugu';
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpedEvents, setRsvpedEvents] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const theme = useTheme();

  // Auto-refresh events whenever screen receives focus
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [])
  );

  // Tick timer every 30s for live countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Date and Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Add/Edit Event form states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newBanner, setNewBanner] = useState('');
  const [requiresRSVP, setRequiresRSVP] = useState(false);
  const [newDate, setNewDate] = useState(''); // YYYY-MM-DD
  const [newTime, setNewTime] = useState(''); // HH:MM AM/PM
  const [submitting, setSubmitting] = useState(false);

  const getEventCountdown = (eventDateStr: string) => {
    const target = new Date(eventDateStr).getTime();
    const diff = target - currentTime;

    if (diff <= 0) {
      const eventDate = new Date(eventDateStr);
      const today = new Date();
      const isToday = eventDate.toDateString() === today.toDateString();
      if (isToday) {
        return {
          isLive: true,
          text: isTel ? '🔥 ఈరోజే జరుగుతుంది' : '🔥 Happening Today',
          color: '#e65100',
          bg: '#fff3e0',
          borderColor: '#ffe0b2'
        };
      }
      return {
        isPast: true,
        text: isTel ? '✓ ముగిసింది' : '✓ Completed',
        color: '#757575',
        bg: '#f5f5f5',
        borderColor: '#e0e0e0'
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let countdownStr = '';
    if (days > 0) {
      countdownStr = `${days}d : ${hours}h : ${mins}m`;
    } else if (hours > 0) {
      countdownStr = `${hours}h : ${mins}m to go`;
    } else {
      countdownStr = `${mins}m to go`;
    }

    return {
      isFuture: true,
      text: `⏳ ${countdownStr}`,
      color: '#0d47a1',
      bg: '#e3f2fd',
      borderColor: '#bbdefb'
    };
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          isTel ? 'అనుమతి అవసరం' : 'Permission Required',
          isTel ? 'ఫోటోను ఎంచుకోవడానికి గ్యాలరీ అనుమతి అవసరం.' : 'Permission to access gallery photos is required.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Direct upload without crop screen navigation
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setNewBanner(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setNewBanner(asset.uri);
        }
      }
    } catch (err: any) {
      console.log('Error picking image:', err);
      Alert.alert('Gallery Error', err.message || 'Failed to select image');
    }
  };

  // Dropdown lists & modal selector states
  const [venuesList, setVenuesList] = useState<string[]>(['Main Sanctuary', 'Youth Chapel', 'Branch Church 2']);
  const [preachersList, setPreachersList] = useState<string[]>(['Pastor John Doe', 'Pastor David', 'Evangelist Billy Graham']);
  
  const [selectedVenueOption, setSelectedVenueOption] = useState<string>('Main Sanctuary');
  const [selectedPreacherOption, setSelectedPreacherOption] = useState<string>('Pastor John Doe');

  const [venuePickerExpanded, setVenuePickerExpanded] = useState(false);
  const [preacherPickerExpanded, setPreacherPickerExpanded] = useState(false);

  const [tempNewVenue, setTempNewVenue] = useState('');
  const [tempNewPreacher, setTempNewPreacher] = useState('');

  const handleOpenDatePicker = () => {
    if (newDate && !isNaN(Date.parse(newDate))) {
      setPickerDate(new Date(newDate));
    } else {
      setPickerDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      setNewDate(formattedDate);
    }
  };

  const handleOpenTimePicker = () => {
    const d = new Date();
    if (newTime) {
      const match = newTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hrs = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        d.setHours(hrs, mins);
      }
    }
    setPickerDate(d);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      let hours = selectedDate.getHours();
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      setNewTime(formattedTime);
    }
  };

  // Load RSVP cache on startup
  useEffect(() => {
    const loadRsvps = async () => {
      try {
        const cached = await AsyncStorage.getItem('rsvpedEvents');
        if (cached) setRsvpedEvents(JSON.parse(cached));
      } catch (err) {
        console.log('Error loading RSVP cache:', err);
      }
    };
    loadRsvps();
  }, []);

  // Load custom dropdown options on mount
  useEffect(() => {
    const loadCustomOptions = async () => {
      try {
        const storedVenues = await AsyncStorage.getItem('custom_venues');
        if (storedVenues) {
          setVenuesList(JSON.parse(storedVenues));
        }
        const storedPreachers = await AsyncStorage.getItem('custom_preachers');
        if (storedPreachers) {
          setPreachersList(JSON.parse(storedPreachers));
        }
      } catch (e) {
        console.log('Error loading custom drop downs:', e);
      }
    };
    loadCustomOptions();
  }, []);

  const handleAddNewVenue = async () => {
    if (!tempNewVenue.trim()) {
      alert('Please enter a location name.');
      return;
    }
    const updated = [...venuesList, tempNewVenue.trim()];
    setVenuesList(updated);
    await AsyncStorage.setItem('custom_venues', JSON.stringify(updated));
    setNewVenue(tempNewVenue.trim());
    setSelectedVenueOption(tempNewVenue.trim());
    setTempNewVenue('');
  };

  const handleAddNewPreacher = async () => {
    if (!tempNewPreacher.trim()) {
      alert('Please enter a preacher name.');
      return;
    }
    const updated = [...preachersList, tempNewPreacher.trim()];
    setPreachersList(updated);
    await AsyncStorage.setItem('custom_preachers', JSON.stringify(updated));
    setNewSpeaker(tempNewPreacher.trim());
    setSelectedPreacherOption(tempNewPreacher.trim());
    setTempNewPreacher('');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleRSVP = async (eventId: string) => {
    let updated = [...rsvpedEvents];
    const isGoing = updated.includes(eventId);

    if (isGoing) {
      updated = updated.filter(id => id !== eventId);
    } else {
      updated.push(eventId);
    }

    setRsvpedEvents(updated);
    await AsyncStorage.setItem('rsvpedEvents', JSON.stringify(updated));

    const userId = user?._id || user?.id || 'guest_user';
    try {
      await eventsService.toggleRSVP(eventId, userId);
    } catch (err) {
      console.log('RSVP toggle sync error:', err);
    }
    alert(isGoing ? 'Cancelled RSVP' : '🎉 You are RSVPed to attend!');
  };

  const handleShareEvent = async (evt: any) => {
    const formattedDate = new Date(evt.date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
    const shareMessage = `🌟 *${evt.title}*\n🎙️ ${isTel ? 'ప్రసంగీకులు' : 'Speaker'}: ${evt.speaker || (isTel ? 'సంఘ కాపరి' : 'Senior Pastor')}\n📅 ${isTel ? 'తేదీ & సమయం' : 'Date & Time'}: ${formattedDate}\n📍 ${isTel ? 'స్థలము' : 'Venue'}: ${evt.venue}\n\n✝️ ${isTel ? 'దేవుని సన్నిధిలో ఆశీర్వదింపబడటానికి అందరికీ ప్రేమపూర్వక ఆహ్వానం!' : 'You are warmly invited to attend and be blessed in God\'s presence!'}\n\n📲 Shared via SFGC App`;

    try {
      const bannerUri = evt.banner || evt.imageUrl;
      if (bannerUri && (await Sharing.isAvailableAsync())) {
        if (bannerUri.startsWith('data:image')) {
          const parts = bannerUri.split(',');
          const base64Data = parts[1] || parts[0];
          const tempFile = new FSFile(Paths.cache, `church_event_${Date.now()}.jpg`);
          tempFile.create();
          tempFile.write(base64Data, { encoding: 'base64' });
          await Sharing.shareAsync(tempFile.uri, {
            dialogTitle: `Share ${evt.title}`,
            mimeType: 'image/jpeg',
            UTI: 'public.jpeg',
          });
          return;
        } else if (bannerUri.startsWith('http://') || bannerUri.startsWith('https://')) {
          const downloaded = await FSFile.downloadFileAsync(bannerUri, Paths.cache);
          await Sharing.shareAsync(downloaded.uri, {
            dialogTitle: `Share ${evt.title}`,
            mimeType: 'image/jpeg',
            UTI: 'public.jpeg',
          });
          return;
        }
      }

      await Share.share({
        title: evt.title,
        message: shareMessage,
      });
    } catch (err: any) {
      console.log('Share error:', err);
      try {
        await Share.share({ title: evt.title, message: shareMessage });
      } catch (e) {}
    }
  };

  // Authorization check for managing events
  const canManageEvents = user && ['Admin', 'Super Admin', 'Event Coordinator', 'Notice Manager', 'Media Team'].includes(user.role);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setNewBanner('');
    setRequiresRSVP(false);
    
    const defaultVenue = venuesList[0] || 'custom';
    const defaultSpeaker = preachersList[0] || 'custom';
    
    setSelectedVenueOption(defaultVenue);
    setSelectedPreacherOption(defaultSpeaker);
    
    setNewVenue(defaultVenue !== 'custom' ? defaultVenue : '');
    setNewSpeaker(defaultSpeaker !== 'custom' ? defaultSpeaker : '');
    
    setAddModalVisible(true);
  };

  const handleOpenEditModal = (evt: any) => {
    setEditingId(evt._id);
    setNewTitle(evt.title);
    setNewBanner(evt.banner || evt.imageUrl || '');
    setRequiresRSVP(Boolean(evt.requiresRSVP));
    
    const speakerVal = evt.speaker || '';
    setNewSpeaker(speakerVal);
    if (speakerVal === '') {
      setSelectedPreacherOption('custom');
    } else if (preachersList.includes(speakerVal)) {
      setSelectedPreacherOption(speakerVal);
    } else {
      setSelectedPreacherOption('custom');
    }

    const venueVal = evt.venue || '';
    setNewVenue(venueVal);
    if (venueVal === '') {
      setSelectedVenueOption('custom');
    } else if (venuesList.includes(venueVal)) {
      setSelectedVenueOption(venueVal);
    } else {
      setSelectedVenueOption('custom');
    }
    
    // Parse ISO date string to separate date and time fields
    const d = new Date(evt.date);
    const dateStr = d.toISOString().split('T')[0];
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    setNewDate(dateStr);
    setNewTime(timeStr);
    setAddModalVisible(true);
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete event "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await eventsService.deleteEvent(eventId);
              if (response.success) {
                refreshData();
              } else {
                alert(`Error deleting event: ${response.message || 'Failed to delete'}`);
              }
            } catch (err: any) {
              alert(`Error deleting event: ${err.message}`);
            }
          }
        }
      ]
    );
  };

  const handleAddEventSubmit = async () => {
    if (!newTitle || !newVenue || !newDate || !newTime) {
      alert('Please fill in Title, Venue, Date, and Time.');
      return;
    }

    setSubmitting(true);
    try {
      // Parse YYYY-MM-DD and HH:MM AM/PM into unified ISO date
      const dateParts = newDate.split('-');
      const timeParts = newTime.match(/(\d+):(\d+)\s*(AM|PM)/i);

      if (!timeParts) {
        alert('Invalid time format. Please use e.g. 09:30 AM');
        setSubmitting(false);
        return;
      }

      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const ampm = timeParts[3].toUpperCase();

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      const combinedDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        hours,
        minutes
      );
      const combinedIsoDate = combinedDate.toISOString();

      const payload = {
        title: newTitle,
        venue: newVenue,
        date: combinedIsoDate,
        speaker: newSpeaker,
        banner: newBanner.trim(),
        requiresRSVP: Boolean(requiresRSVP),
      };

      let response;
      if (editingId) {
        response = await eventsService.updateEvent(editingId, payload);
      } else {
        response = await eventsService.addEvent(payload);
      }

      if (response.success) {
        alert(editingId ? '🎉 Event updated successfully!' : '🎉 Event added successfully!');
        setNewTitle('');
        setNewSpeaker('');
        setNewVenue('');
        setNewDate('');
        setNewTime('');
        setNewBanner('');
        setRequiresRSVP(false);
        setEditingId(null);
        setAddModalVisible(false);
        refreshData();
      } else {
        alert(`Failed to save event: ${response.message || 'Error'}`);
      }
    } catch (err: any) {
      console.log('Save event error:', err);
      alert(`Error saving event: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // UI Utilities
  const getCalendarParts = (dateString: string) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const d = new Date(dateString);
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    return {
      monthStr: months[d.getMonth()],
      dayNum: String(d.getDate()).padStart(2, '0'),
      timeStr
    };
  };

  const getEventCategory = (titleStr: string) => {
    const t = titleStr.toLowerCase();
    if (t.includes('youth')) return { label: isTel ? 'యూత్ కూడిక' : 'YOUTH NIGHT', icon: 'account-multiple', color: '#e91e63' };
    if (t.includes('choir') || t.includes('singing')) return { label: isTel ? 'గాయక బృందం' : 'CHOIR PRACTICE', icon: 'music-clef-treble', color: '#ff9800' };
    if (t.includes('fasting') || t.includes('prayer')) return { label: isTel ? 'ఉపవాస ప్రార్థన' : 'FASTING PRAYER', icon: 'hands-pray', color: '#4caf50' };
    if (t.includes('combined')) return { label: isTel ? 'సంయుక్త ఆరాధన' : 'COMBINED SERVICE', icon: 'account-group', color: '#9c27b0' };
    return { label: isTel ? 'ఆరాధన కూడిక' : 'WORSHIP SERVICE', icon: 'church', color: theme.primary };
  };

  return (
    <Portal.Host>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} colors={[theme.primary]} />
        }
      >
        <View style={styles.summaryBox}>
          <Text style={styles.summaryDesc}>
            {isTel ? 'రాబోయే ఆరాధన కూడికలు, ప్రార్థన సమయాలు మరియు ప్రత్యేక కార్యక్రమాలను చూడండి.' : 'Explore upcoming worship services, prayer meetings, and special events.'}
          </Text>
        </View>

        {(() => {
          const activeEvents = (events || [])
            .filter((e) => {
              const eventDate = new Date(e.date);
              // Allow event to remain active for the full calendar day until 23:59:59
              const endOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59).getTime();
              return endOfDay >= currentTime;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          return activeEvents && activeEvents.length > 0 ? (
            activeEvents.map((evt) => {
              const eventKey = evt._id || evt.id || evt.title;
              const cal = getCalendarParts(evt.date);
              const countdown = getEventCountdown(evt.date);
              const hasRsvped = rsvpedEvents.includes(eventKey);
              const rsvpRequired = Boolean(evt.requiresRSVP);
              const rsvpCount = (evt.rsvps || []).length + (hasRsvped && !(evt.rsvps || []).includes(user?._id || '') ? 1 : 0);
              
              return (
                <Card style={styles.card} key={eventKey}>
                  {/* Top Center Floating Countdown Timer Pill on the Border */}
                  <View style={styles.topCenterTimerContainer}>
                    <View style={[styles.countdownPill, { backgroundColor: countdown.bg, borderColor: countdown.borderColor }]}>
                      <Text style={[styles.countdownText, { color: countdown.color }]}>
                        {countdown.text}
                      </Text>
                    </View>
                  </View>

                  {/* Full Size Uploaded Poster Banner (Aspect-Preserved) */}
                  {Boolean(evt.banner || evt.imageUrl) && (
                    <View style={styles.imageWrapper}>
                      <Image
                        source={{ uri: evt.banner || evt.imageUrl }}
                        style={styles.eventCardImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View style={[styles.cardBody, !Boolean(evt.banner || evt.imageUrl) && { paddingTop: 24 }]}>
                    {/* Calendar Box */}
                    <View style={styles.calendarColumn}>
                      <View style={[styles.calendarMonthBox, { backgroundColor: theme.primary }]}>
                        <Text style={styles.calendarMonthText}>{cal.monthStr}</Text>
                      </View>
                      <View style={styles.calendarDateBox}>
                        <Text style={styles.calendarDateText}>{cal.dayNum}</Text>
                      </View>
                    </View>

                    {/* Details Column */}
                    <View style={styles.infoColumn}>
                      <Title style={styles.eventTitle}>{evt.title}</Title>
                      
                      {evt.speaker ? (
                        <Text style={styles.eventSpeaker}>🎙️ {evt.speaker}</Text>
                      ) : null}

                      <View style={styles.metaInfoRow}>
                        <MaterialCommunityIcons name="clock-outline" size={15} color="#616161" />
                        <Text style={styles.metaText}>{cal.timeStr}</Text>
                      </View>

                      <View style={[styles.metaInfoRow, { marginTop: 4 }]}>
                        <MaterialCommunityIcons name="map-marker-outline" size={15} color="#616161" />
                        <Text style={[styles.metaText, { flex: 1 }]} numberOfLines={2}>{evt.venue}</Text>
                      </View>

                      {/* Attendance Count (Only when RSVP is enabled) */}
                      {rsvpRequired && (
                        <View style={styles.attendanceInfoRow}>
                          <MaterialCommunityIcons name="account-check" size={16} color="#2e7d32" />
                          <Text style={styles.attendanceText}>
                            {rsvpCount > 0 
                              ? (isTel ? `${rsvpCount} మంది హాజరవుతున్నారు` : `${rsvpCount} attending`)
                              : (isTel ? 'హాజరు నమోదు తెరవబడింది' : 'RSVP Open')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Divider style={{ marginHorizontal: 14 }} />

                  <Card.Actions style={styles.cardActions}>
                    <Button 
                      icon="share-variant" 
                      mode="text" 
                      textColor={theme.primary}
                      onPress={() => handleShareEvent(evt)}
                      style={{ borderRadius: 8 }}
                    >
                      {isTel ? 'షేర్ చేయండి' : 'Share Poster'}
                    </Button>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canManageEvents && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                          <IconButton
                            icon="pencil-outline"
                            iconColor="#424242"
                            size={19}
                            onPress={() => handleOpenEditModal(evt)}
                            style={{ margin: 0 }}
                          />
                          <IconButton
                            icon="delete-outline"
                            iconColor="#d32f2f"
                            size={19}
                            onPress={() => handleDeleteEvent(eventKey, evt.title)}
                            style={{ margin: 0 }}
                          />
                        </View>
                      )}

                      {/* RSVP / Attend Button only if required */}
                      {rsvpRequired && (
                        <Button 
                          mode={hasRsvped ? "outlined" : "contained"} 
                          buttonColor={hasRsvped ? undefined : theme.primary}
                          textColor={hasRsvped ? theme.primary : "#fff"}
                          style={{ borderColor: theme.primary, borderRadius: 8 }}
                          contentStyle={{ paddingHorizontal: 4 }}
                          onPress={() => handleRSVP(eventKey)}
                        >
                          {hasRsvped ? (isTel ? '✓ హాజరవుతున్నాను' : '✓ Going') : (isTel ? 'హాజరు నమోదు' : 'RSVP / Attend')}
                        </Button>
                      )}
                    </View>
                  </Card.Actions>
                </Card>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Avatar.Icon size={64} icon="calendar-blank" style={{ backgroundColor: '#f5f5f5' }} color="#bdbdbd" />
              <Text style={styles.emptyText}>
                {isTel ? 'ప్రస్తుతానికి ఎటువంటి కార్యక్రమాలు నమోదు కాలేదు.' : 'No upcoming services registered at the moment.'}
              </Text>
            </View>
          );
        })()}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Floating Action Button for Event Creation (Authorized roles only) */}
      {canManageEvents && (
        <FAB
          icon="plus"
          style={styles.fab}
          color="#ffffff"
          onPress={handleOpenAddModal}
        />
      )}

      {/* Add/Edit Event Form Modal */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>
            {editingId ? 'Edit Church Event' : 'Add Church Event'}
          </Title>
          <ScrollView showsVerticalScrollIndicator={false}>
            
            <Text style={styles.inputLabel}>Event Title *</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Sunday Miracle Worship Service"
              placeholderTextColor="#666666"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>
              {isTel ? 'ఈవెంట్ పోస్టర్ / చిత్రం (Event Banner Image)' : 'Event Banner Image (Poster)'}
            </Text>
            
            {Boolean(newBanner) ? (
              <View style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f9f9fb' }}>
                <Image
                  source={{ uri: newBanner }}
                  style={{ width: '100%', height: 160, backgroundColor: '#f0f0f0' }}
                  resizeMode="cover"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#fff' }}>
                  <Button
                    icon="image-edit"
                    mode="outlined"
                    textColor={theme.primary}
                    style={{ flex: 1, marginRight: 6, borderColor: theme.primary }}
                    onPress={pickImageFromGallery}
                  >
                    {isTel ? 'ఫోటో మార్చండి' : 'Change Image'}
                  </Button>
                  <Button
                    icon="delete-outline"
                    mode="outlined"
                    textColor="#d32f2f"
                    style={{ borderColor: '#ffcdd2' }}
                    onPress={() => setNewBanner('')}
                  >
                    {isTel ? 'తొలగించు' : 'Remove'}
                  </Button>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={pickImageFromGallery}
                style={{
                  borderWidth: 1.5,
                  borderColor: theme.primary,
                  borderStyle: 'dashed',
                  borderRadius: 10,
                  paddingVertical: 20,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8f9fe',
                  marginBottom: 16,
                }}
              >
                <MaterialCommunityIcons name="image-plus" size={36} color={theme.primary} />
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.primary, marginTop: 6 }}>
                  {isTel ? '📸 గ్యాలరీ నుండి ఫోటో ఎంచుకోండి' : '📸 Select Image from Gallery'}
                </Text>
                <Text style={{ fontSize: 11, color: '#757575', marginTop: 2 }}>
                  {isTel ? 'ఈవెంట్ పోస్టర్ లేదా ఆహ్వాన పత్రికను జోడించండి' : 'Upload event poster or church celebration banner'}
                </Text>
              </TouchableOpacity>
            )}

            {/* RSVP / Attendance Count Toggle */}
            <View style={styles.switchCard}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.switchLabel}>
                  {isTel ? '👥 హాజరు నమోదు (Require RSVP)' : '👥 Require RSVP / Track Attendance'}
                </Text>
                <Text style={styles.switchHint}>
                  {isTel ? 'ఈవెంట్‌కు హాజరయ్యే భక్తుల సంఖ్యను లెక్కించడానికి దీన్ని ఆన్ చేయండి' : 'Enable if this event requires RSVP & attendee count'}
                </Text>
              </View>
              <Switch
                value={requiresRSVP}
                onValueChange={setRequiresRSVP}
                trackColor={{ false: '#e0e0e0', true: theme.primary + '80' }}
                thumbColor={requiresRSVP ? theme.primary : '#f4f3f4'}
              />
            </View>

            <Text style={styles.inputLabel}>Preacher / Speaker Name</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.dropdownPicker, { borderColor: theme.cardBorder }]}
              onPress={() => setPreacherPickerExpanded(!preacherPickerExpanded)}
            >
              <Text style={[styles.dropdownPickerValue, { color: theme.text }]}>
                {selectedPreacherOption === 'custom' 
                  ? (newSpeaker || 'Type custom preacher name...') 
                  : (selectedPreacherOption === 'new' 
                      ? 'Add new preacher speaker...' 
                      : selectedPreacherOption)}
              </Text>
              <MaterialCommunityIcons name={preacherPickerExpanded ? "menu-up" : "menu-down"} size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Expandable Inline Preacher Picker */}
            {preacherPickerExpanded && (
              <View style={[styles.inlinePickerCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                {preachersList.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.inlinePickerItem, selectedPreacherOption === p && styles.inlinePickerItemActive]}
                    onPress={() => {
                      setSelectedPreacherOption(p);
                      setNewSpeaker(p);
                      setPreacherPickerExpanded(false);
                    }}
                  >
                    <Text style={[styles.inlinePickerText, { color: theme.text }, selectedPreacherOption === p && { color: theme.primary, fontWeight: 'bold' }]}>
                      🎙️ {p}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.inlinePickerItem, selectedPreacherOption === 'custom' && styles.inlinePickerItemActive]}
                  onPress={() => {
                    setSelectedPreacherOption('custom');
                    setNewSpeaker('');
                    setPreacherPickerExpanded(false);
                  }}
                >
                  <Text style={[styles.inlinePickerText, { color: theme.text }, selectedPreacherOption === 'custom' && { color: theme.primary, fontWeight: 'bold' }]}>
                    ✏️ Custom Preacher Speaker...
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlinePickerItem, selectedPreacherOption === 'new' && styles.inlinePickerItemActive]}
                  onPress={() => {
                    setSelectedPreacherOption('new');
                    setPreacherPickerExpanded(false);
                  }}
                >
                  <Text style={[styles.inlinePickerText, { color: theme.text }, selectedPreacherOption === 'new' && { color: theme.primary, fontWeight: 'bold' }]}>
                    ➕ Add New Preacher Speaker...
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Custom Preacher TextInput */}
            {selectedPreacherOption === 'custom' && (
              <TextInput
                value={newSpeaker}
                onChangeText={setNewSpeaker}
                placeholder="Type preacher/speaker name..."
                placeholderTextColor="#888"
                style={styles.textInput}
              />
            )}

            {/* Add New Preacher Row */}
            {selectedPreacherOption === 'new' && (
              <View style={styles.inlineAddRow}>
                <TextInput
                  value={tempNewPreacher}
                  onChangeText={setTempNewPreacher}
                  placeholder="Enter name to add..."
                  placeholderTextColor="#888"
                  style={[styles.textInput, { flex: 1, marginTop: 0 }]}
                />
                <Button mode="contained" buttonColor={theme.primary} onPress={handleAddNewPreacher}>
                  Add
                </Button>
              </View>
            )}

            <Text style={styles.inputLabel}>Venue / Location *</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.dropdownPicker, { borderColor: theme.cardBorder }]}
              onPress={() => setVenuePickerExpanded(!venuePickerExpanded)}
            >
              <Text style={[styles.dropdownPickerValue, { color: theme.text }]}>
                {selectedVenueOption === 'custom' 
                  ? (newVenue || 'Type custom location venue...') 
                  : (selectedVenueOption === 'new' 
                      ? 'Add new location branch...' 
                      : selectedVenueOption)}
              </Text>
              <MaterialCommunityIcons name={venuePickerExpanded ? "menu-up" : "menu-down"} size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Expandable Inline Venue Picker */}
            {venuePickerExpanded && (
              <View style={[styles.inlinePickerCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                {venuesList.map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.inlinePickerItem, selectedVenueOption === v && styles.inlinePickerItemActive]}
                    onPress={() => {
                      setSelectedVenueOption(v);
                      setNewVenue(v);
                      setVenuePickerExpanded(false);
                    }}
                  >
                    <Text style={[styles.inlinePickerText, { color: theme.text }, selectedVenueOption === v && { color: theme.primary, fontWeight: 'bold' }]}>
                      🏢 {v}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.inlinePickerItem, selectedVenueOption === 'custom' && styles.inlinePickerItemActive]}
                  onPress={() => {
                    setSelectedVenueOption('custom');
                    setNewVenue('');
                    setVenuePickerExpanded(false);
                  }}
                >
                  <Text style={[styles.inlinePickerText, { color: theme.text }, selectedVenueOption === 'custom' && { color: theme.primary, fontWeight: 'bold' }]}>
                    ✏️ Custom Venue Location...
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlinePickerItem, selectedVenueOption === 'new' && styles.inlinePickerItemActive]}
                  onPress={() => {
                    setSelectedVenueOption('new');
                    setVenuePickerExpanded(false);
                  }}
                >
                  <Text style={[styles.inlinePickerText, { color: theme.text }, selectedVenueOption === 'new' && { color: theme.primary, fontWeight: 'bold' }]}>
                    ➕ Create & Add New Location...
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Custom Venue TextInput */}
            {selectedVenueOption === 'custom' && (
              <TextInput
                value={newVenue}
                onChangeText={setNewVenue}
                placeholder="Type branch/location venue details..."
                placeholderTextColor="#888"
                style={styles.textInput}
              />
            )}

            {/* Add New Venue Row */}
            {selectedVenueOption === 'new' && (
              <View style={styles.inlineAddRow}>
                <TextInput
                  value={tempNewVenue}
                  onChangeText={setTempNewVenue}
                  placeholder="Enter branch name to add..."
                  placeholderTextColor="#888"
                  style={[styles.textInput, { flex: 1, marginTop: 0 }]}
                />
                <Button mode="contained" buttonColor={theme.primary} onPress={handleAddNewVenue}>
                  Add
                </Button>
              </View>
            )}

            <Text style={styles.inputLabel}>Event Date *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  fontSize: 14,
                  width: '100%',
                  marginBottom: 16,
                  outlineStyle: 'none',
                } as any}
              />
            ) : (
              <TouchableOpacity onPress={handleOpenDatePicker} activeOpacity={0.8} style={{ marginBottom: 16 }}>
                <View pointerEvents="none">
                  <TextInput
                    value={newDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#888"
                    style={styles.textInput}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Event Time *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={newTime.includes(' ') ? '' : newTime}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':');
                  let hours = parseInt(h);
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  hours = hours % 12;
                  hours = hours ? hours : 12;
                  setNewTime(`${String(hours).padStart(2, '0')}:${m} ${ampm}`);
                }}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  fontSize: 14,
                  width: '100%',
                  marginBottom: 16,
                  outlineStyle: 'none',
                } as any}
              />
            ) : (
              <TouchableOpacity onPress={handleOpenTimePicker} activeOpacity={0.8} style={{ marginBottom: 16 }}>
                <View pointerEvents="none">
                  <TextInput
                    value={newTime}
                    placeholder="HH:MM AM/PM"
                    placeholderTextColor="#888"
                    style={styles.textInput}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <Button mode="outlined" style={{ flex: 1, marginRight: 8 }} onPress={() => setAddModalVisible(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button 
                mode="contained" 
                buttonColor={theme.primary} 
                style={{ flex: 1 }} 
                onPress={handleAddEventSubmit}
                loading={submitting}
                disabled={submitting}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
  },
  summaryBox: {
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  summaryDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  card: {
    marginBottom: 24,
    marginTop: 10,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  topCenterTimerContainer: {
    position: 'absolute',
    top: -13,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  imageWrapper: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardImage: {
    width: '100%',
    minHeight: 180,
    maxHeight: 380,
    aspectRatio: 16 / 9,
  },
  cardBody: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  calendarColumn: {
    width: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    alignItems: 'center',
    height: 72,
  },
  calendarMonthBox: {
    width: '100%',
    paddingVertical: 3,
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  calendarDateBox: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f9f9fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDateText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212121',
  },
  infoColumn: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 4,
  },
  eventSpeaker: {
    fontSize: 13,
    color: '#424242',
    fontWeight: '600',
    marginBottom: 6,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#616161',
    marginLeft: 5,
  },
  attendanceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  attendanceText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#2e7d32',
    marginLeft: 4,
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    backgroundColor: '#c62828',
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
    color: '#1a1a1a',
    marginBottom: 14,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#1a1a1a',
    marginTop: 4,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
  },
  switchHint: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
  },
  dropdownPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: '#ffffff',
    marginTop: 6,
    marginBottom: 8,
  },
  dropdownPickerValue: {
    fontSize: 14,
  },
  inlineAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '75%',
    elevation: 5,
  },
  modalScroll: {
    marginVertical: 10,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 15,
  },
  inlinePickerCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4,
    padding: 4,
    elevation: 1,
  },
  inlinePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  inlinePickerItemActive: {
    backgroundColor: 'rgba(198, 40, 40, 0.08)',
  },
  inlinePickerText: {
    fontSize: 14.5,
  },
});
