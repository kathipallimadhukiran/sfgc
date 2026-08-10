import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, RefreshControl, Share, TextInput, Alert, Platform } from 'react-native';
import { Card, Title, Paragraph, Button, Text, Avatar, IconButton, Portal, Modal, FAB } from 'react-native-paper';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { noticesService } from '@/services/noticesService';

export default function NotificationsScreen() {
  const { notices, refreshData, loading, user, token } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  // Add/Edit Notice form states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLoc, setNewLoc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleShareNotice = async (notice: any) => {
    try {
      await Share.share({
        title: notice.title,
        message: `📢 *${notice.title}*\n\n${notice.description}\n\nTime: ${notice.time || 'N/A'}\nLocation: ${notice.location || 'N/A'}\n\nShared from ChurchConnect App`,
      });
    } catch (error) {
      console.log('Error sharing notice:', error);
    }
  };

  // Authorization check for notices
  const canManageNotices = user && ['Admin', 'Super Admin', 'Notice Manager', 'Media Team', 'Event Coordinator'].includes(user.role);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNewTitle('');
    setNewDesc('');
    setNewTime('');
    setNewLoc('');
    setAddModalVisible(true);
  };

  const handleOpenEditModal = (notice: any) => {
    setEditingId(notice._id);
    setNewTitle(notice.title);
    setNewDesc(notice.description);
    setNewTime(notice.time || '');
    setNewLoc(notice.location || '');
    setAddModalVisible(true);
  };

  const handleDeleteNotice = (noticeId: string, title: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete notice "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await noticesService.deleteNotice(noticeId);
              if (response.success) {
                refreshData();
              } else {
                alert(`Error deleting notice: ${response.message || 'Failed to delete'}`);
              }
            } catch (err: any) {
              alert(`Error deleting notice: ${err.message}`);
            }
          }
        }
      ]
    );
  };

  const handleAddNoticeSubmit = async () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      alert('Please fill in Title and Description.');
      return;
    }

    setSubmitting(true);
    const payload = {
      title: newTitle,
      description: newDesc,
      time: newTime,
      location: newLoc
    };

    try {
      let response;
      if (editingId) {
        response = await noticesService.updateNotice(editingId, payload);
      } else {
        response = await noticesService.addNotice(payload);
      }

      if (response.success) {
        alert(editingId ? '🎉 Announcement updated successfully!' : '🎉 Announcement posted successfully!');
        setNewTitle('');
        setNewDesc('');
        setNewTime('');
        setNewLoc('');
        setEditingId(null);
        setAddModalVisible(false);
        refreshData();
      } else {
        alert(`Failed to save announcement: ${response.message || 'Error'}`);
      }
    } catch (err: any) {
      console.log('Save notice error:', err);
      alert(`Error saving notice: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
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
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.subtitle}>
            Stay updated with the latest announcements, meetings, and notifications from our church.
          </Text>
        </View>

        {notices && notices.length > 0 ? (
          notices.map((notice) => (
            <Card style={styles.card} key={notice._id}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Avatar.Icon
                    size={42}
                    icon={notice.title.toLowerCase().includes('fellowship') ? 'account-group' : 'bell-ring'}
                    style={{ backgroundColor: theme.accentBackground }}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Title style={styles.cardTitle}>{notice.title}</Title>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton
                        icon="share-variant"
                        size={18}
                        iconColor="#757575"
                        style={{ margin: 0, padding: 0 }}
                        onPress={() => handleShareNotice(notice)}
                      />
                      {canManageNotices && (
                        <>
                          <IconButton
                            icon="pencil"
                            size={16}
                            iconColor={theme.primary}
                            style={{ margin: 0, padding: 0 }}
                            onPress={() => handleOpenEditModal(notice)}
                          />
                          <IconButton
                            icon="delete"
                            size={16}
                            iconColor={theme.primary}
                            style={{ margin: 0, padding: 0 }}
                            onPress={() => handleDeleteNotice(notice._id || notice.id || '', notice.title)}
                          />
                        </>
                      )}
                    </View>
                  </View>
                  <Paragraph style={styles.description}>{notice.description}</Paragraph>
                  
                  <View style={styles.metaRow}>
                    {notice.time && (
                      <Text style={styles.metaText}>
                        🕒 {notice.time}
                      </Text>
                    )}
                    {notice.location && (
                      <Text style={styles.metaText}>
                        📍 {notice.location}
                      </Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={70} icon="bell-outline" style={{ backgroundColor: '#f5f5f5' }} color="#bdbdbd" />
            <Text variant="titleMedium" style={styles.emptyText}>
              No new notices or alerts at the moment.
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Floating Action Button for Notice Creation (Authorized roles only) */}
      {canManageNotices && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.primary }]}
          color="#ffffff"
          onPress={handleOpenAddModal}
        />
      )}

      {/* Add/Edit Notice Form Modal */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>
            {editingId ? 'Edit Announcement' : 'Post Announcement'}
          </Title>
          <ScrollView showsVerticalScrollIndicator={false}>
            
            <Text style={styles.inputLabel}>Notice Title *</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Combined Service Coffee Fellowship"
              placeholderTextColor="#666666"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Notice Description *</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Type announcement details here..."
              placeholderTextColor="#666666"
              multiline
              numberOfLines={4}
              style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
            />

            <Text style={styles.inputLabel}>Time (Optional)</Text>
            <TextInput
              value={newTime}
              onChangeText={setNewTime}
              placeholder="e.g. 10:30 AM"
              placeholderTextColor="#666666"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Location (Optional)</Text>
            <TextInput
              value={newLoc}
              onChangeText={setNewLoc}
              placeholder="e.g. Fellowship Hall"
              placeholderTextColor="#666666"
              style={styles.textInput}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" style={{ flex: 1, marginRight: 8 }} onPress={() => setAddModalVisible(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button 
                mode="contained" 
                buttonColor={theme.primary} 
                style={{ flex: 1 }} 
                onPress={handleAddNoticeSubmit}
                loading={submitting}
                disabled={submitting}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
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
  header: {
    marginBottom: 16,
  },
  subtitle: {
    color: '#666',
    lineHeight: 20,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
  },
  cardContent: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 13.5,
    color: '#424242',
    lineHeight: 18,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  metaText: {
    fontSize: 11.5,
    color: '#757575',
    fontWeight: '500',
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
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 14,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#757575',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#1a1a1a',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
  },
});
