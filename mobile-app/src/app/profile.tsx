import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Platform, Alert, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Text, TextInput, Avatar, HelperText, Checkbox, Divider, IconButton, ActivityIndicator, Modal, Portal, Menu } from 'react-native-paper';
import { useApp } from '@/context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';
import { departmentService, DepartmentItem } from '@/services/departmentService';

const DEFAULT_DEPARTMENTS = ['Worship Team', 'Choir', 'Media Team', 'Children\'s Ministry', 'Security', 'Prayer Team', 'Ushering'];

const MINISTRY_OPTIONS = [
  'Worship Team & Choir',
  'Media & Technology',
  'Children\'s Ministry & Sunday School',
  'Youth & Student Ministry',
  'Prayer & Intercession',
  'Security & Ushering',
  'Evangelism & Outreach',
  'Ladies Fellowship',
  'Senior Members Care',
];

const inputTheme = {
  colors: {
    primary: '#6366f1',
    outline: '#94a3b8',
    text: '#0f172a',
    onSurface: '#0f172a',
    onSurfaceVariant: '#64748b',
    placeholder: '#94a3b8',
    background: '#ffffff'
  }
};

export default function ProfileScreen() {
  const { user, logout, token, selectedBiblePlan, setSelectedBiblePlan, language, setLanguage, bibleLanguage, setBibleLanguage, themeMode, setThemeMode } = useApp();
  const theme = useTheme();
  const isTel = language === 'Telugu';
  const [activeModal, setActiveModal] = useState<'personal' | 'bible_plan' | 'language' | 'theme' | 'volunteer' | 'admin_members' | 'assignments' | null>(null);
  
  // Date Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDatePickerField, setActiveDatePickerField] = useState<'birthday' | 'baptismDate' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Voluntary Departments State
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [showAddDeptForm, setShowAddDeptForm] = useState(false);
  
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getDepartments();
      if (res.success && res.departments && res.departments.length > 0) {
        setDepartmentsList(res.departments);
      } else {
        setDepartmentsList(DEFAULT_DEPARTMENTS.map((name, i) => ({ _id: `def_${i}`, name })));
      }
    } catch (err) {
      console.log('Error fetching departments:', err);
      setDepartmentsList(DEFAULT_DEPARTMENTS.map((name, i) => ({ _id: `def_${i}`, name })));
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) {
      alert('Please enter department name.');
      return;
    }
    try {
      const res = await departmentService.createDepartment(newDeptName.trim());
      if (res.success) {
        setNewDeptName('');
        setShowAddDeptForm(false);
        fetchDepartments();
        alert('🎉 Department added successfully!');
      } else {
        alert(res.message || 'Failed to add department');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding department');
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Delete department "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await departmentService.deleteDepartment(id);
              if (res.success) {
                fetchDepartments();
                alert(`Department "${name}" deleted.`);
              } else {
                alert(res.message || 'Failed to delete department');
              }
            } catch (err: any) {
              alert(err.message || 'Error deleting department');
            }
          }
        }
      ]
    );
  };

  const handleOpenDatePicker = (field: 'birthday' | 'baptismDate') => {
    setActiveDatePickerField(field);
    const existingVal = field === 'birthday' ? regData.birthday : regData.baptismDate;
    if (existingVal && !isNaN(Date.parse(existingVal))) {
      setPickerDate(new Date(existingVal));
    } else {
      setPickerDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && activeDatePickerField) {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      setRegData(prev => ({ ...prev, [activeDatePickerField]: formattedDate }));
    }
  };

  // Volunteer state
  const [checkedDeps, setCheckedDeps] = useState<string[]>(user?.departments || []);

  // Admin Members Manager state
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [showFilterDeptMenu, setShowFilterDeptMenu] = useState(false);

  // Admin Duty Assignment modal states
  const [selectedMemberForAssignment, setSelectedMemberForAssignment] = useState<any>(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('');
  const [assignmentDept, setAssignmentDept] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleSaveAssignment = async () => {
    if (!selectedMemberForAssignment || !assignmentTitle.trim() || !assignmentRole.trim()) {
      alert('Please fill out assignment title and role.');
      return;
    }
    try {
      const res = await authService.addAssignment(selectedMemberForAssignment._id, {
        title: assignmentTitle.trim(),
        role: assignmentRole.trim(),
        department: assignmentDept || selectedMemberForAssignment.departments?.[0] || 'General',
        status: 'Assigned',
        date: new Date().toISOString(),
      });
      if (res.success) {
        alert(`🎉 Duty assignment created for ${selectedMemberForAssignment.name}!`);
        setShowAssignModal(false);
        setAssignmentTitle('');
        setAssignmentRole('');
        fetchMembers();
      } else {
        alert(res.message || 'Failed to add duty assignment.');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating duty assignment.');
    }
  };

  // Registration form state (Role removed, defaults to Member)
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
    location: '',
    birthday: '',
    baptismDate: '',
    ministry: '',
    isFamilyHead: true,
    familyHeadName: '',
    familyHeadMobileNumber: '',
    familyHeadEmail: '',
    familyMembersCount: '1'
  });

  // Family Card collapse/expand and edit states
  const [showFamilyCardDetails, setShowFamilyCardDetails] = useState(false);
  const [showEditFamilyModal, setShowEditFamilyModal] = useState(false);
  const [showProfileMinistryDropdown, setShowProfileMinistryDropdown] = useState(false);
  const [editFamilyData, setEditFamilyData] = useState({
    email: user?.email || '',
    familyName: user?.familyName || '',
    location: user?.location || '',
    mobileNumber: user?.mobileNumber || '',
    secondaryMobileNumber: user?.secondaryMobileNumber || '',
    birthday: user?.birthday || '',
    baptismDate: user?.baptismDate || '',
    familyHeadName: user?.familyHeadName || '',
    familyHeadMobileNumber: user?.familyHeadMobileNumber || '',
    familyMembersCount: String(user?.familyMembersCount || '1'),
    ministry: user?.ministry || '',
  });

  React.useEffect(() => {
    const checkInitialRegistration = async () => {
      try {
        const flag = await AsyncStorage.getItem('just_registered');
        if (flag === 'true') {
          await AsyncStorage.removeItem('just_registered');
          setActiveModal('bible_plan');
        }
      } catch (e) {}
    };
    checkInitialRegistration();
  }, []);

  // Bible Study Plan selection state - removed (now from AppContext)
  // Custom Bible Plan states
  const [showCustomBiblePlanForm, setShowCustomBiblePlanForm] = useState(false);
  const [customBiblePlans, setCustomBiblePlans] = useState<any[]>([]);
  const [newBiblePlanName, setNewBiblePlanName] = useState('');
  const [newBiblePlanStartDate, setNewBiblePlanStartDate] = useState('');
  const [newBiblePlanEndDate, setNewBiblePlanEndDate] = useState('');
  const [newBiblePlanTarget, setNewBiblePlanTarget] = useState('');

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await authService.getMembers();
      if (response.success) {
        setMembers(response.members);
      }
    } catch (err) {
      console.log('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDeleteMember = (memberId: string, name: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete member "${name}"? This action cannot be undone and will remove them from the church records.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await authService.deleteMember(memberId);
              if (response.success) {
                alert('🎉 Member deleted successfully!');
                fetchMembers(); // reload list
              } else {
                alert(`Failed to delete: ${response.message || 'Error deleting member'}`);
              }
            } catch (err: any) {
              console.log('Delete member error:', err);
              alert(`Failed to delete: ${err.message}`);
            }
          }
        }
      ]
    );
  };


  const handleVolunteerToggle = async (dep: string) => {
    let updatedDeps = [...checkedDeps];
    if (updatedDeps.includes(dep)) {
      updatedDeps = updatedDeps.filter(d => d !== dep);
    } else {
      updatedDeps.push(dep);
    }
    
    setCheckedDeps(updatedDeps);

    // Save choice to in-app database
    if (user?._id || user?.id) {
      try {
        await authService.saveVolunteering(user._id || user.id, updatedDeps);
      } catch (err) {
        console.log('Error saving volunteer state');
      }
    }
  };

  const handleSaveEditedFamily = async () => {
    setLoading(true);
    try {
      const targetUserId = user?._id || user?.id;
      if (!targetUserId) {
        alert('Please log in first.');
        return;
      }
      const response = await authService.updateProfile(targetUserId, editFamilyData);
      if (response.success) {
        alert('✅ Family details updated successfully!');
        setShowEditFamilyModal(false);
      } else {
        alert(`Failed to update: ${response.message || 'Error updating profile'}`);
      }
    } catch (err: any) {
      console.log('Error updating family details:', err);
      alert(`Failed to update: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBiblePlan = async (planId: string) => {
    await setSelectedBiblePlan(planId);
  };

  const handleAddCustomBiblePlan = () => {
    if (!newBiblePlanName || !newBiblePlanStartDate || !newBiblePlanEndDate || !newBiblePlanTarget) {
      alert('Please fill out all fields.');
      return;
    }

    const startDate = new Date(newBiblePlanStartDate);
    const endDate = new Date(newBiblePlanEndDate);
    
    if (endDate <= startDate) {
      alert('End date must be after start date.');
      return;
    }

    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const newPlan = {
      id: `custom_bible_${Date.now()}`,
      name: newBiblePlanName,
      startDate: newBiblePlanStartDate,
      endDate: newBiblePlanEndDate,
      todayReading: newBiblePlanTarget,
      totalDays: daysCount,
      daysCompleted: 0,
      isCustom: true
    };

    setCustomBiblePlans(prev => [newPlan, ...prev]);
    setNewBiblePlanName('');
    setNewBiblePlanStartDate('');
    setNewBiblePlanEndDate('');
    setNewBiblePlanTarget('');
    setShowCustomBiblePlanForm(false);
    alert('🎉 Custom Bible Plan created successfully!');
  };

  if (user) {
    // Authenticated Profile View (Premium Settings List with Popups Layout)
    const isAdmin = ['Admin', 'Super Admin'].includes(user.role);

    // Fetch members if admin modal opens
    const handleOpenAdminMembers = () => {
      setActiveModal('admin_members');
      fetchMembers();
    };

    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.contentContainer}>
        {/* Profile Card Header (Sleek Photo/No Photo Layout) */}
        <View style={[styles.profileHeader, { backgroundColor: theme.backgroundElement, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, paddingVertical: 24, borderRadius: 16, marginBottom: 18 }]}>
          <Avatar.Text 
            size={72} 
            label={user.name?.slice(0, 2).toUpperCase() || 'US'} 
            style={[styles.profileAvatar, { backgroundColor: theme.accentBackground }]} 
            labelStyle={[styles.profileAvatarText, { color: theme.primary }]} 
          />
          <Title style={[styles.profileName, { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 10 }]}>{user.name}</Title>
          <View style={{ backgroundColor: isAdmin ? '#ffebee' : theme.backgroundSelected, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: isAdmin ? '#d32f2f' : theme.textSecondary }}>
              {isAdmin ? (isTel ? 'నిర్వాహకుడు' : 'Admin') : (isTel ? 'సభ్యుడు' : 'Member')}
            </Text>
          </View>
        </View>

        {/* 1-by-1 Settings Rows List */}
        <View style={{ backgroundColor: theme.backgroundElement, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden', marginBottom: 20 }}>
          {/* Row 1: Personal & Family Card */}
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]} 
            onPress={() => setActiveModal('personal')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons name="card-account-details-outline" size={22} color={theme.primary} />
              <Text style={[styles.settingsRowText, { color: theme.text }]}>
                {isTel ? 'వ్యక్తిగత & కుటుంబ కార్డ్' : 'Personal & Family Card'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Row 2: Bible Reading Plan */}
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]} 
            onPress={() => setActiveModal('bible_plan')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons name="book-open-outline" size={22} color={theme.primary} />
              <Text style={[styles.settingsRowText, { color: theme.text }]}>
                {isTel ? 'బైబిల్ పఠన ప్రణాళిక' : 'Bible Reading Plan'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Row 3: Language Preference */}
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]} 
            onPress={() => setActiveModal('language')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons name="translate" size={22} color={theme.primary} />
              <Text style={[styles.settingsRowText, { color: theme.text }]}>
                {isTel ? 'భాషా ప్రాధాన్యత' : 'Language Preference'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                {language === 'Telugu' ? 'తెలుగు' : 'English'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Row 4: App Theme Preference */}
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]} 
            onPress={() => setActiveModal('theme')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons name="theme-light-dark" size={22} color={theme.primary} />
              <Text style={[styles.settingsRowText, { color: theme.text }]}>
                {isTel ? 'యాప్ థీమ్' : 'App Theme'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                {themeMode === 'dark' ? (isTel ? 'చీకటి' : 'Dark') : (isTel ? 'కాంతి' : 'Light')}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Row 5: Volunteer Registration */}
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]} 
            onPress={() => setActiveModal('volunteer')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons name="hand-heart-outline" size={22} color={theme.primary} />
              <Text style={[styles.settingsRowText, { color: theme.text }]}>
                {isTel ? 'స్వచ్ఛంద రిజిస్ట్రేషన్లు' : 'Volunteer Opportunities'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Row 6: My Assignments & Duties */}
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: isAdmin ? 1 : 0 }]} 
            onPress={() => setActiveModal('assignments')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={22} color={theme.primary} />
              <Text style={[styles.settingsRowText, { color: theme.text }]}>
                {isTel ? 'నా అసైన్‌మెంట్లు & బాధ్యతలు' : 'My Assignments & Duties'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {Array.isArray(user?.assignments) && user.assignments.length > 0 && (
                <View style={{ backgroundColor: '#c62828', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{user.assignments.length}</Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Row 7: Manage Members Directory (Admin only) */}
          {isAdmin && (
            <TouchableOpacity 
              style={[styles.settingsRow, { borderBottomWidth: 0 }]} 
              onPress={handleOpenAdminMembers}
            >
              <View style={styles.settingsRowLeft}>
                <MaterialCommunityIcons name="account-group-outline" size={22} color={theme.primary} />
                <Text style={[styles.settingsRowText, { color: theme.text }]}>
                  {isTel ? 'సభ్యుల డైరెక్టరీ నిర్వహణ' : 'Manage Members Directory'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Logout Button */}
        <Button 
          mode="outlined" 
          textColor="#c62828" 
          style={{ borderRadius: 12, borderColor: '#c62828', borderWidth: 1.5, marginBottom: 40 }}
          labelStyle={{ fontWeight: '600', fontSize: 15 }}
          onPress={logout}
          icon="logout"
        >
          {isTel ? 'సైన్ అవుట్' : 'Sign Out'}
        </Button>

        {/* ==================== PORTAL SETTINGS POPUP MODALS ==================== */}

        {/* 1. Personal Details Modal */}
        <Portal>
          <Modal 
            visible={activeModal === 'personal'} 
            onDismiss={() => { setActiveModal(null); setShowEditFamilyModal(false); }} 
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '90%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    {isTel ? 'వ్యక్తిగత & కుటుంబ వివరాలు' : 'Personal & Family Details'}
                  </Title>
                  <IconButton icon="close" iconColor={theme.text} size={22} onPress={() => { setActiveModal(null); setShowEditFamilyModal(false); }} style={{ margin: 0 }} />
                </View>
                <Divider style={{ marginVertical: 6, backgroundColor: theme.cardBorder }} />

                {!showEditFamilyModal ? (
                  <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'ఈమెయిల్:' : 'Email:'}</Text> {user.email || 'N/A'}</Paragraph>
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'కుటుంబం పేరు:' : 'Family Name:'}</Text> {user.familyName || 'N/A'}</Paragraph>
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'ప్రాంతం:' : 'Location:'}</Text> {user.location || 'N/A'}</Paragraph>
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'ప్రాథమిక ఫోన్ (లాక్ చేయబడింది):' : 'Primary Phone (Locked):'}</Text> 🔒 {user.mobileNumber || 'N/A'}</Paragraph>
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'రెండవ ఫోన్ నంబర్:' : 'Secondary Mobile:'}</Text> {user.secondaryMobileNumber || 'N/A'}</Paragraph>
                    {user.birthday && <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'పుట్టినరోజు:' : 'Birthday:'}</Text> {user.birthday}</Paragraph>}
                    {user.baptismDate && <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'బాప్తిస్మపు తేదీ:' : 'Baptism Date:'}</Text> {user.baptismDate}</Paragraph>}
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'కుటుంబ పెద్ద:' : 'Family Head:'}</Text> {user.familyHeadName || 'N/A'}</Paragraph>
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'పెద్ద ఫోన్:' : 'Head Phone:'}</Text> {user.familyHeadMobileNumber || 'N/A'}</Paragraph>
                    <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'కుటుంబ పరిమాణం:' : 'Family size:'}</Text> {user.familyMembersCount || 1}</Paragraph>
                    {user.ministry && <Paragraph style={{ marginVertical: 4, fontSize: 13.5, color: theme.text }}><Text style={{ fontWeight: 'bold' }}>{isTel ? 'పరిచర్య:' : 'Ministry:'}</Text> {user.ministry}</Paragraph>}
                    
                    <Button 
                      mode="contained" 
                      buttonColor="#c62828" 
                      style={{ marginTop: 16, borderRadius: 12 }}
                      onPress={() => setShowEditFamilyModal(true)}
                    >
                      {isTel ? 'వివరాలను సవరించు' : 'Edit Details'}
                    </Button>
                  </ScrollView>
                ) : (
                  <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                      {isTel ? 'ఈమెయిల్ చిరునామా' : 'Email Address'}
                    </Text>
                    <TextInput
                      placeholder="e.g. member@example.com"
                      value={editFamilyData.email}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, email: val })}
                      mode="outlined"
                      theme={inputTheme}
                      textColor={theme.text}
                      placeholderTextColor={theme.textSecondary}
                      left={<TextInput.Icon icon="email-outline" color={theme.textSecondary} />}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />

                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                      {isTel ? 'ప్రాథమిక ఫోన్ నంబర్ (లాక్ చేయబడింది)' : 'Primary Mobile Number (Locked)'}
                    </Text>
                    <TextInput
                      value={editFamilyData.mobileNumber}
                      editable={false}
                      mode="outlined"
                      theme={inputTheme}
                      textColor={theme.textSecondary}
                      left={<TextInput.Icon icon="lock" color={theme.textSecondary} />}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected, opacity: 0.7 }}
                    />

                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                      {isTel ? 'రెండవ ఫోన్ నంబర్ (యాక్టివ్)' : 'Secondary / Alternate Mobile Number'}
                    </Text>
                    <TextInput
                      placeholder="e.g. 9876543210"
                      value={editFamilyData.secondaryMobileNumber}
                      onChangeText={val => {
                        const clean = val.replace(/\D/g, '').slice(0, 10);
                        setEditFamilyData({ ...editFamilyData, secondaryMobileNumber: clean });
                      }}
                      mode="outlined"
                      keyboardType="number-pad"
                      maxLength={10}
                      theme={inputTheme}
                      textColor={theme.text}
                      placeholderTextColor={theme.textSecondary}
                      left={<TextInput.Icon icon="phone-plus-outline" color={theme.primary} />}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />

                    <TextInput
                      label="Family Name"
                      value={editFamilyData.familyName}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, familyName: val })}
                      mode="outlined"
                      theme={inputTheme}
                      textColor={theme.text}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />
                    <TextInput
                      label="Location"
                      value={editFamilyData.location}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, location: val })}
                      mode="outlined"
                      theme={inputTheme}
                      textColor={theme.text}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />
                    <TextInput
                      label="Birthday (YYYY-MM-DD)"
                      value={editFamilyData.birthday}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, birthday: val })}
                      mode="outlined"
                      theme={inputTheme}
                      textColor={theme.text}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />
                    <TextInput
                      label="Baptism Date (YYYY-MM-DD)"
                      value={editFamilyData.baptismDate}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, baptismDate: val })}
                      mode="outlined"
                      theme={inputTheme}
                      textColor={theme.text}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />
                    <TextInput
                      label="Family Head Name"
                      value={editFamilyData.familyHeadName}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, familyHeadName: val })}
                      mode="outlined"
                      theme={inputTheme}
                      textColor={theme.text}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />
                    <TextInput
                      label="Family Head Mobile"
                      value={editFamilyData.familyHeadMobileNumber}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, familyHeadMobileNumber: val })}
                      mode="outlined"
                      keyboardType="phone-pad"
                      theme={inputTheme}
                      textColor={theme.text}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />
                    <TextInput
                      label="Family Members Count"
                      value={editFamilyData.familyMembersCount}
                      onChangeText={val => setEditFamilyData({ ...editFamilyData, familyMembersCount: val })}
                      mode="outlined"
                      keyboardType="number-pad"
                      theme={inputTheme}
                      textColor={theme.text}
                      style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                    />

                    {/* Ministry Interest Selection Dropdown */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                      {isTel ? 'ఆసక్తిగల పరిచర్య విభాగం' : 'Ministry Interest Selection'}
                    </Text>
                    <View style={{ marginBottom: 16 }}>
                      <Menu
                        visible={showProfileMinistryDropdown}
                        onDismiss={() => setShowProfileMinistryDropdown(false)}
                        anchor={
                          <TouchableOpacity onPress={() => setShowProfileMinistryDropdown(true)} activeOpacity={0.8}>
                            <View pointerEvents="none">
                              <TextInput
                                mode="outlined"
                                value={editFamilyData.ministry || (isTel ? '-- పరిచర్యను ఎంచుకోండి --' : '-- Select Ministry --')}
                                editable={false}
                                theme={inputTheme}
                                textColor={theme.text}
                                left={<TextInput.Icon icon="hands-pray" color={theme.primary} />}
                                right={<TextInput.Icon icon="chevron-down" color={theme.textSecondary} />}
                                style={{ backgroundColor: theme.backgroundSelected }}
                              />
                            </View>
                          </TouchableOpacity>
                        }
                        contentStyle={{ backgroundColor: theme.backgroundElement, borderRadius: 12 }}
                      >
                        <Menu.Item
                          onPress={() => {
                            setEditFamilyData({ ...editFamilyData, ministry: '' });
                            setShowProfileMinistryDropdown(false);
                          }}
                          title={isTel ? '-- దేనినీ ఎంచుకోవద్దు --' : '-- None / Select Later --'}
                        />
                        <Divider />
                        {MINISTRY_OPTIONS.map((minItem) => (
                          <Menu.Item
                            key={minItem}
                            onPress={() => {
                              setEditFamilyData({ ...editFamilyData, ministry: minItem });
                              setShowProfileMinistryDropdown(false);
                            }}
                            title={minItem}
                          />
                        ))}
                      </Menu>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Button mode="outlined" style={{ flex: 1 }} onPress={() => setShowEditFamilyModal(false)} textColor="#c62828">
                        {isTel ? 'వెనుకకు' : 'Back'}
                      </Button>
                      <Button mode="contained" style={{ flex: 1 }} buttonColor="#c62828" onPress={handleSaveEditedFamily}>
                        {isTel ? 'సేవ్ చేయి' : 'Save'}
                      </Button>
                    </View>
                  </ScrollView>
                )}
              </Card.Content>
            </Card>
          </Modal>
        </Portal>

        {/* 2. Bible Study Plan Modal */}
        <Portal>
          <Modal 
            visible={activeModal === 'bible_plan'} 
            onDismiss={() => { setActiveModal(null); setShowCustomBiblePlanForm(false); }} 
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '90%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    {isTel ? 'బైబిల్ పఠన ప్రణాళిక' : 'Bible Reading Plan'}
                  </Title>
                  <IconButton icon="close" iconColor={theme.text} size={22} onPress={() => { setActiveModal(null); setShowCustomBiblePlanForm(false); }} style={{ margin: 0 }} />
                </View>
                <Divider style={{ marginVertical: 6, backgroundColor: theme.cardBorder }} />

                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {!showCustomBiblePlanForm ? (
                    <>
                      <Paragraph style={{ color: theme.textSecondary, marginBottom: 10, fontSize: 13, fontWeight: '500' }}>
                        {isTel ? 'మీకు నచ్చిన బైబిల్ పఠన ప్రణాళికను ఎంచుకోండి:' : 'Select your preferred Bible reading plan:'}
                      </Paragraph>
                      <View style={{ gap: 6, marginBottom: 16 }}>
                        {[
                          { id: '1year', label: isTel ? '📖 1-సంవత్సరం ప్రణాళిక' : '📖 1-Year Plan', desc: isTel ? '1 సంవత్సరంలో బైబిల్ అంతా చదవండి' : 'Read entire Bible in 1 year' },
                          { id: '3year', label: isTel ? '📚 3-సంవత్సరాల ప్రణాళిక' : '📚 3-Year Plan', desc: isTel ? '3 సంవత్సరాలలో బైబిల్ అంతా చదవండి' : 'Read entire Bible in 3 years' },
                          { id: 'gospels', label: isTel ? '✝️ సువార్తల ధ్యానం' : '✝️ Gospels Focus', desc: isTel ? 'మత్తయి, మార్కు, లూకా, యోహానులపై దృష్టి కేంద్రీకరించండి' : 'Focus on Matthew, Mark, Luke, John' },
                          { id: 'ot', label: isTel ? '📖 పాత నిబంధన' : '📖 Old Testament', desc: isTel ? 'పాత నిబంధన గ్రంథాలన్నీ' : 'All books of Old Testament' },
                          { id: 'nt', label: isTel ? '✨ క్రొత్త నిబంధన' : '✨ New Testament', desc: isTel ? 'క్రొత్త నిబంధన గ్రంథాలన్నీ' : 'All books of New Testament' }
                        ].map(plan => (
                          <TouchableOpacity 
                            key={plan.id}
                            onPress={() => handleSelectBiblePlan(plan.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 10,
                              backgroundColor: selectedBiblePlan === plan.id ? theme.accentBackground : theme.backgroundSelected,
                              borderRadius: 10,
                              borderWidth: selectedBiblePlan === plan.id ? 2 : 1,
                              borderColor: selectedBiblePlan === plan.id ? '#c62828' : theme.cardBorder,
                            }}
                          >
                            <View style={{ marginRight: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                              <View 
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 8,
                                  borderWidth: 2,
                                  borderColor: selectedBiblePlan === plan.id ? '#c62828' : theme.textSecondary,
                                  backgroundColor: selectedBiblePlan === plan.id ? '#c62828' : 'transparent',
                                }}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 1 }}>{plan.label}</Text>
                              <Text style={{ fontSize: 11, color: theme.textSecondary }}>{plan.desc}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Button 
                        mode="outlined" 
                        textColor="#c62828"
                        style={{ borderColor: '#c62828', borderRadius: 12, marginBottom: 12 }}
                        onPress={() => setShowCustomBiblePlanForm(true)}
                        icon="plus"
                      >
                        {isTel ? 'వ్యక్తిగత ప్రణాళికను సృష్టించండి' : 'Create Custom Plan'}
                      </Button>

                      {customBiblePlans.length > 0 && (
                        <View style={{ marginTop: 10 }}>
                          <Divider style={{ marginBottom: 12, backgroundColor: theme.cardBorder }} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
                            {isTel ? 'మీ వ్యక్తిగత ప్రణాళికలు:' : 'Your Custom Plans:'}
                          </Text>
                          {customBiblePlans.map(plan => (
                            <View key={plan.id} style={{ backgroundColor: theme.backgroundSelected, padding: 10, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: theme.cardBorder }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 2 }}>{plan.name}</Text>
                              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>📅 {plan.startDate} → {plan.endDate} ({plan.totalDays} days)</Text>
                              <Text style={{ fontSize: 12, color: theme.text }}>📖 {plan.todayReading}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <TextInput
                        label={isTel ? 'ప్రణాళిక పేరు' : 'Plan Name'}
                        value={newBiblePlanName}
                        onChangeText={setNewBiblePlanName}
                        mode="outlined"
                        placeholder="e.g. Romans Study"
                        textColor={theme.text}
                        theme={inputTheme}
                        style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                      />
                      <TextInput
                        label={isTel ? 'ప్రారంభ తేదీ (YYYY-MM-DD)' : 'Start Date (YYYY-MM-DD)'}
                        value={newBiblePlanStartDate}
                        onChangeText={setNewBiblePlanStartDate}
                        mode="outlined"
                        placeholder="2025-01-15"
                        textColor={theme.text}
                        theme={inputTheme}
                        style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                      />
                      <TextInput
                        label={isTel ? 'ముగింపు తేదీ (YYYY-MM-DD)' : 'End Date (YYYY-MM-DD)'}
                        value={newBiblePlanEndDate}
                        onChangeText={setNewBiblePlanEndDate}
                        mode="outlined"
                        placeholder="2025-02-15"
                        textColor={theme.text}
                        theme={inputTheme}
                        style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                      />
                      <TextInput
                        label={isTel ? 'లక్ష్యం (ఉదా. రోమీయులకు 1-3)' : 'Target Passage (e.g. Romans 1-3)'}
                        value={newBiblePlanTarget}
                        onChangeText={setNewBiblePlanTarget}
                        mode="outlined"
                        placeholder="e.g. Romans 1-3"
                        textColor={theme.text}
                        theme={inputTheme}
                        style={{ marginBottom: 16, backgroundColor: theme.backgroundSelected }}
                      />
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Button mode="outlined" style={{ flex: 1 }} onPress={() => setShowCustomBiblePlanForm(false)} textColor="#c62828">
                          {isTel ? 'వెనుకకు' : 'Back'}
                        </Button>
                        <Button mode="contained" style={{ flex: 1 }} buttonColor="#c62828" onPress={handleAddCustomBiblePlan}>
                          {isTel ? 'సృష్టించు' : 'Create'}
                        </Button>
                      </View>
                    </>
                  )}
                </ScrollView>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>

        {/* 3. Dual Language Preference Modal */}
        <Portal>
          <Modal 
            visible={activeModal === 'language'} 
            onDismiss={() => setActiveModal(null)} 
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '92%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    {isTel ? 'భాషా ప్రాధాన్యతలు' : 'Language Preferences'}
                  </Title>
                  <IconButton icon="close" iconColor={theme.text} size={22} onPress={() => setActiveModal(null)} style={{ margin: 0 }} />
                </View>
                <Divider style={{ marginVertical: 6, backgroundColor: theme.cardBorder }} />
                
                {/* 1. App Interface Language */}
                <View style={{ marginTop: 8, marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary, marginBottom: 4 }}>
                    📱 {isTel ? '1. యాప్ ఇంటర్‌ఫేస్ భాష (App Language)' : '1. App Interface Language'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginBottom: 8 }}>
                    {isTel ? 'మెనూలు, బటన్లు మరియు ప్రకటనల కోసం భాష:' : 'Language for menus, buttons, and notices:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setLanguage('Telugu')}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                        backgroundColor: language === 'Telugu' ? theme.accentBackground : theme.backgroundSelected,
                        borderRadius: 10,
                        borderWidth: language === 'Telugu' ? 2 : 1,
                        borderColor: language === 'Telugu' ? theme.primary : theme.cardBorder,
                        gap: 8
                      }}
                    >
                      <View 
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: language === 'Telugu' ? theme.primary : theme.textSecondary,
                          backgroundColor: language === 'Telugu' ? theme.primary : 'transparent',
                        }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>తెలుగు</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setLanguage('English')}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                        backgroundColor: language === 'English' ? theme.accentBackground : theme.backgroundSelected,
                        borderRadius: 10,
                        borderWidth: language === 'English' ? 2 : 1,
                        borderColor: language === 'English' ? theme.primary : theme.cardBorder,
                        gap: 8
                      }}
                    >
                      <View 
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: language === 'English' ? theme.primary : theme.textSecondary,
                          backgroundColor: language === 'English' ? theme.primary : 'transparent',
                        }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>English</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Divider style={{ marginVertical: 8, backgroundColor: theme.cardBorder }} />

                {/* 2. Bible, Daily Promise & Quiz Language */}
                <View style={{ marginTop: 6, marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary, marginBottom: 4 }}>
                    📖 {isTel ? '2. బైబిల్, వాగ్దానము & క్విజ్ భాష (Bible Language)' : '2. Bible, Promises & Quiz Language'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginBottom: 8 }}>
                    {isTel ? 'బైబిల్ గ్రంథం, నేటి వాగ్దానాలు మరియు క్విజ్ ప్రశ్నల కోసం భాష:' : 'Language for Scriptures, Daily Promises, and Quiz:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setBibleLanguage('Telugu')}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                        backgroundColor: bibleLanguage === 'Telugu' ? theme.accentBackground : theme.backgroundSelected,
                        borderRadius: 10,
                        borderWidth: bibleLanguage === 'Telugu' ? 2 : 1,
                        borderColor: bibleLanguage === 'Telugu' ? theme.primary : theme.cardBorder,
                        gap: 8
                      }}
                    >
                      <View 
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: bibleLanguage === 'Telugu' ? theme.primary : theme.textSecondary,
                          backgroundColor: bibleLanguage === 'Telugu' ? theme.primary : 'transparent',
                        }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>తెలుగు</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setBibleLanguage('English')}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                        backgroundColor: bibleLanguage === 'English' ? theme.accentBackground : theme.backgroundSelected,
                        borderRadius: 10,
                        borderWidth: bibleLanguage === 'English' ? 2 : 1,
                        borderColor: bibleLanguage === 'English' ? theme.primary : theme.cardBorder,
                        gap: 8
                      }}
                    >
                      <View 
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: bibleLanguage === 'English' ? theme.primary : theme.textSecondary,
                          backgroundColor: bibleLanguage === 'English' ? theme.primary : 'transparent',
                        }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>English</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Button 
                  mode="contained" 
                  buttonColor={theme.primary} 
                  textColor="#fff" 
                  style={{ borderRadius: 10, marginTop: 6 }} 
                  onPress={() => setActiveModal(null)}
                >
                  {isTel ? 'ఖరారు చేయి (Done)' : 'Done'}
                </Button>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>

        {/* 4. App Theme Modal */}
        <Portal>
          <Modal 
            visible={activeModal === 'theme'} 
            onDismiss={() => setActiveModal(null)} 
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '90%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    {isTel ? 'యాప్ థీమ్ ఎంపిక' : 'App Theme Selection'}
                  </Title>
                  <IconButton icon="close" iconColor={theme.text} size={22} onPress={() => setActiveModal(null)} style={{ margin: 0 }} />
                </View>
                <Divider style={{ marginVertical: 6, backgroundColor: theme.cardBorder }} />
                <Paragraph style={{ color: theme.textSecondary, marginBottom: 16, fontSize: 13, fontWeight: '500' }}>
                  {isTel ? 'యాప్ రూపకల్పన థీమ్ ఎంచుకోండి:' : 'Select app interface theme preference:'}
                </Paragraph>
                
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { setThemeMode('light'); setActiveModal(null); }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      backgroundColor: themeMode === 'light' ? theme.accentBackground : theme.backgroundSelected,
                      borderRadius: 10,
                      borderWidth: themeMode === 'light' ? 2 : 1,
                      borderColor: themeMode === 'light' ? theme.primary : theme.cardBorder,
                      gap: 8
                    }}
                  >
                    <View 
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: themeMode === 'light' ? theme.primary : theme.textSecondary,
                        backgroundColor: themeMode === 'light' ? theme.primary : 'transparent',
                      }}
                    />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{isTel ? 'కాంతి థీమ్' : 'Light Mode'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { setThemeMode('dark'); setActiveModal(null); }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      backgroundColor: themeMode === 'dark' ? theme.accentBackground : theme.backgroundSelected,
                      borderRadius: 10,
                      borderWidth: themeMode === 'dark' ? 2 : 1,
                      borderColor: themeMode === 'dark' ? theme.primary : theme.cardBorder,
                      gap: 8
                    }}
                  >
                    <View 
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: themeMode === 'dark' ? theme.primary : theme.textSecondary,
                        backgroundColor: themeMode === 'dark' ? theme.primary : 'transparent',
                      }}
                    />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{isTel ? 'చీకటి థీమ్' : 'Dark Mode'}</Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>

        {/* 5. Volunteer Opportunity Modal */}
        <Portal>
          <Modal 
            visible={activeModal === 'volunteer'} 
            onDismiss={() => { setActiveModal(null); setShowAddDeptForm(false); }} 
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '92%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    {isTel ? 'స్వచ్ఛంద రిజిస్ట్రేషన్లు' : 'Volunteer Opportunities'}
                  </Title>
                  <IconButton icon="close" iconColor={theme.text} size={22} onPress={() => { setActiveModal(null); setShowAddDeptForm(false); }} style={{ margin: 0 }} />
                </View>
                <Divider style={{ marginVertical: 6, backgroundColor: theme.cardBorder }} />
                <Paragraph style={{ color: theme.textSecondary, marginBottom: 10, fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                  {isTel ? 'మీరు సేవ చేయాలనుకుంటున్న విభాగాలను ఎంచుకోండి (Voluntary Departments):' : 'Select departments added by admin to volunteer & serve:'}
                </Paragraph>

                {isAdmin && (
                  <View style={{ marginBottom: 10 }}>
                    {!showAddDeptForm ? (
                      <Button
                        mode="outlined"
                        textColor={theme.primary}
                        style={{ borderColor: theme.primary, borderRadius: 10 }}
                        compact
                        icon="plus"
                        onPress={() => setShowAddDeptForm(true)}
                      >
                        {isTel ? 'కొత్త విభాగం జోడించు (Admin)' : 'Add Voluntary Department (Admin)'}
                      </Button>
                    ) : (
                      <View style={{ backgroundColor: theme.backgroundSelected, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 6 }}>
                          {isTel ? 'కొత్త స్వచ్ఛంద విభాగం:' : 'New Voluntary Department:'}
                        </Text>
                        <TextInput
                          placeholder="e.g. Youth Ministry"
                          value={newDeptName}
                          onChangeText={setNewDeptName}
                          mode="outlined"
                          textColor={theme.text}
                          placeholderTextColor={theme.textSecondary}
                          style={{ backgroundColor: theme.backgroundElement, marginBottom: 8, height: 40 }}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Button mode="outlined" compact style={{ flex: 1 }} onPress={() => setShowAddDeptForm(false)}>
                            Cancel
                          </Button>
                          <Button mode="contained" compact buttonColor={theme.primary} style={{ flex: 1 }} onPress={handleAddDepartment}>
                            Save
                          </Button>
                        </View>
                      </View>
                    )}
                  </View>
                )}
                
                <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {departmentsList.map(dept => {
                    const depName = dept.name;
                    const translatedDep = isTel ? (
                      depName === 'Worship Team' ? 'ఆరాధన బృందం' :
                      depName === 'Choir' ? 'గాయక బృందం' :
                      depName === 'Media Team' ? 'మీడియా బృందం' :
                      depName === 'Children\'s Ministry' ? 'బాలల పరిచర్య' :
                      depName === 'Security' ? 'భద్రతా విభాగం' : depName
                    ) : depName;
                    const isChecked = checkedDeps.includes(depName);
                    return (
                      <View key={dept._id || depName} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4, paddingHorizontal: 4 }}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} 
                          onPress={() => handleVolunteerToggle(depName)}
                          activeOpacity={0.7}
                        >
                          <Checkbox
                            status={isChecked ? 'checked' : 'unchecked'}
                            onPress={() => handleVolunteerToggle(depName)}
                            color={theme.primary}
                            uncheckedColor={theme.textSecondary}
                          />
                          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text, marginLeft: 6, flex: 1 }}>{translatedDep}</Text>
                        </TouchableOpacity>
                        {isAdmin && dept._id && !dept._id.startsWith('def_') && (
                          <IconButton
                            icon="trash-can-outline"
                            iconColor="#ef4444"
                            size={18}
                            onPress={() => handleDeleteDepartment(dept._id, dept.name)}
                            style={{ margin: 0 }}
                          />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>

        {/* 5.5. My Assignments & Duties Modal */}
        <Portal>
          <Modal 
            visible={activeModal === 'assignments'} 
            onDismiss={() => setActiveModal(null)} 
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '90%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    {isTel ? 'నా అసైన్‌మెంట్లు & బాధ్యతలు' : 'My Assignments & Duties'}
                  </Title>
                  <IconButton icon="close" iconColor={theme.text} size={22} onPress={() => setActiveModal(null)} style={{ margin: 0 }} />
                </View>
                <Divider style={{ marginVertical: 6, backgroundColor: theme.cardBorder }} />
                
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {Array.isArray(user?.assignments) && user.assignments.length > 0 ? (
                    user.assignments.map((item: any, idx: number) => (
                      <View 
                        key={item._id || item.id || idx} 
                        style={{ 
                          padding: 12, 
                          backgroundColor: theme.backgroundSelected, 
                          borderRadius: 12, 
                          marginBottom: 10,
                          borderLeftWidth: 4,
                          borderLeftColor: '#c62828'
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>{item.title || item.role}</Text>
                          <View style={{ backgroundColor: item.status === 'Confirmed' ? '#e8f5e9' : '#fff3e0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: item.status === 'Confirmed' ? '#2e7d32' : '#e65100' }}>
                              {item.status || 'Assigned'}
                            </Text>
                          </View>
                        </View>
                        {item.department ? (
                          <Text style={{ fontSize: 12, color: '#c62828', fontWeight: '600', marginBottom: 2 }}>
                            {item.department} {item.role ? `• ${item.role}` : ''}
                          </Text>
                        ) : null}
                        {item.date ? (
                          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 2 }}>
                            📅 {new Date(item.date).toLocaleDateString()}
                          </Text>
                        ) : null}
                        {item.notes ? (
                          <Text style={{ fontSize: 12, color: theme.text, fontStyle: 'italic', marginTop: 4 }}>
                            "{item.notes}"
                          </Text>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={theme.textSecondary} style={{ marginBottom: 8, opacity: 0.6 }} />
                      <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
                        {isTel ? 'ప్రస్తుతానికి ఎటువంటి అసైన్‌మెంట్లు కేటాయించబడలేదు.' : 'No duties or assignments assigned currently.'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>

        {/* 6. Admin Member Directory Modal */}
        <Portal>
          <Modal 
            visible={activeModal === 'admin_members'} 
            onDismiss={() => setActiveModal(null)} 
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '92%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    {isTel ? 'సభ్యుల డైరెక్టరీ & విభాగాలు' : 'Manage Members & Voluntary Departments'}
                  </Title>
                  <IconButton icon="close" iconColor={theme.text} size={22} onPress={() => setActiveModal(null)} style={{ margin: 0 }} />
                </View>
                <Divider style={{ marginVertical: 6, backgroundColor: theme.cardBorder }} />
                
                {/* Search Bar */}
                <TextInput
                  label={isTel ? 'సభ్యులను శోధించండి' : 'Search Members'}
                  placeholder={isTel ? 'పేరు లేదా ఈమెయిల్ ద్వారా...' : 'Search by name, email or phone...'}
                  value={searchMemberQuery}
                  onChangeText={setSearchMemberQuery}
                  mode="outlined"
                  theme={inputTheme}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  activeOutlineColor={theme.primary}
                  style={{ marginBottom: 8, backgroundColor: theme.backgroundSelected, height: 40 }}
                  contentStyle={{ fontSize: 13 }}
                  left={<TextInput.Icon icon="magnify" color={theme.textSecondary} />}
                />

                {/* Department Filter Selector */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>
                    {isTel ? 'విభాగము వారిగా ఫిల్టర్:' : 'Filter by Department:'}
                  </Text>
                  <Menu
                    visible={showFilterDeptMenu}
                    onDismiss={() => setShowFilterDeptMenu(false)}
                    anchor={
                      <TouchableOpacity 
                        onPress={() => setShowFilterDeptMenu(true)} 
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.backgroundSelected, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary }}>{filterDept}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    }
                    contentStyle={{ backgroundColor: theme.backgroundElement, borderRadius: 10 }}
                  >
                    <Menu.Item onPress={() => { setFilterDept('All'); setShowFilterDeptMenu(false); }} title="All Departments" />
                    <Divider />
                    {departmentsList.map((d) => (
                      <Menu.Item key={d._id || d.name} onPress={() => { setFilterDept(d.name); setShowFilterDeptMenu(false); }} title={d.name} />
                    ))}
                  </Menu>
                </View>

                <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {loadingMembers ? (
                    <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} size="large" />
                  ) : (
                    members
                      .filter(m => {
                        const matchesSearch = 
                          m.name?.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
                          m.email?.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
                          m.mobileNumber?.includes(searchMemberQuery);
                        const matchesDept = filterDept === 'All' || (Array.isArray(m.departments) && m.departments.includes(filterDept));
                        return matchesSearch && matchesDept;
                      })
                      .map(m => (
                        <View key={m._id} style={{ 
                          paddingVertical: 10, 
                          borderBottomWidth: 1, 
                          borderBottomColor: theme.cardBorder,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>{m.name}</Text>
                              <Text style={{ fontSize: 11, color: theme.textSecondary }}>{m.email || 'No email'} ({m.role})</Text>
                              {m.mobileNumber ? <Text style={{ fontSize: 11, color: theme.textSecondary }}>📞 {m.mobileNumber}</Text> : null}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Button
                                mode="outlined"
                                compact
                                textColor={theme.primary}
                                style={{ borderColor: theme.primary, borderRadius: 8, height: 32 }}
                                labelStyle={{ fontSize: 11, marginVertical: 0 }}
                                onPress={() => {
                                  setSelectedMemberForAssignment(m);
                                  setAssignmentDept(m.departments?.[0] || departmentsList[0]?.name || 'General');
                                  setShowAssignModal(true);
                                }}
                              >
                                {isTel ? 'బాధ్యత ఇవ్వు' : 'Assign Duty'}
                              </Button>
                              {m._id !== user.id && (
                                <IconButton
                                  icon="trash-can-outline"
                                  iconColor="#d32f2f"
                                  size={18}
                                  onPress={() => handleDeleteMember(m._id, m.name)}
                                  style={{ margin: 0 }}
                                />
                              )}
                            </View>
                          </View>
                          {/* Department Badges */}
                          {Array.isArray(m.departments) && m.departments.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {m.departments.map((depName: string) => (
                                <View key={depName} style={{ backgroundColor: theme.accentBackground, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.primary }}>🏷️ {depName}</Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={{ fontSize: 10, color: theme.textSecondary, fontStyle: 'italic', marginTop: 2 }}>No voluntary departments joined</Text>
                          )}
                        </View>
                      ))
                  )}
                </ScrollView>
              </Card.Content>
            </Card>
          </Modal>

          {/* Admin Assign Duty Modal */}
          <Modal
            visible={showAssignModal}
            onDismiss={() => setShowAssignModal(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={{ borderRadius: 20, width: '90%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }}>
              <Card.Content style={{ paddingVertical: 18 }}>
                <Title style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                  Assign Duty to {selectedMemberForAssignment?.name}
                </Title>
                <Divider style={{ marginBottom: 12, backgroundColor: theme.cardBorder }} />

                <TextInput
                  label="Duty Title"
                  placeholder="e.g. Sunday Service Audio Operator"
                  value={assignmentTitle}
                  onChangeText={setAssignmentTitle}
                  mode="outlined"
                  theme={inputTheme}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                />

                <TextInput
                  label="Role / Task"
                  placeholder="e.g. Lead Sound Mixing"
                  value={assignmentRole}
                  onChangeText={setAssignmentRole}
                  mode="outlined"
                  theme={inputTheme}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={{ marginBottom: 10, backgroundColor: theme.backgroundSelected }}
                />

                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                  Select Voluntary Department:
                </Text>
                <View style={{ marginBottom: 16 }}>
                  <Menu
                    visible={showDeptDropdown}
                    onDismiss={() => setShowDeptDropdown(false)}
                    anchor={
                      <TouchableOpacity onPress={() => setShowDeptDropdown(true)} activeOpacity={0.8}>
                        <View pointerEvents="none">
                          <TextInput
                            mode="outlined"
                            value={assignmentDept || 'General'}
                            editable={false}
                            theme={inputTheme}
                            textColor={theme.text}
                            right={<TextInput.Icon icon="chevron-down" color={theme.textSecondary} />}
                            style={{ backgroundColor: theme.backgroundSelected }}
                          />
                        </View>
                      </TouchableOpacity>
                    }
                    contentStyle={{ backgroundColor: theme.backgroundElement, borderRadius: 12 }}
                  >
                    {departmentsList.map((d) => (
                      <Menu.Item key={d._id || d.name} onPress={() => { setAssignmentDept(d.name); setShowDeptDropdown(false); }} title={d.name} />
                    ))}
                  </Menu>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button mode="outlined" style={{ flex: 1 }} onPress={() => setShowAssignModal(false)}>
                    Cancel
                  </Button>
                  <Button mode="contained" buttonColor={theme.primary} style={{ flex: 1 }} onPress={handleSaveAssignment}>
                    Assign
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>
      </ScrollView>
    );
  }

  // This screen is protected by the auth gate in _layout.tsx.
  // Unauthenticated users are redirected to auth.tsx before reaching here.
  return null;
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    backgroundColor: '#c62828',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#c62828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  profileAvatar: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#b71c1c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  profileAvatarText: {
    color: '#c62828',
    fontWeight: 'bold',
    fontSize: 28,
  },
  profileName: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#ffffff',
    marginTop: 12,
  },
  profileRole: {
    color: '#ffcdd2',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    elevation: 2.5,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  formContainer: {
    gap: 14,
    paddingVertical: 8,
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  memberEmail: {
    fontSize: 12,
    color: '#757575',
    marginTop: 3,
  },
  memberPhone: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernHeader: {
    alignItems: 'center',
    marginVertical: 28,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#c62828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 18,
  },
  modernHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modernHeaderSubtitle: {
    fontSize: 13.5,
    color: '#757575',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 22,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  activeTabButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#c62828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabButtonText: {
    color: '#c62828',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#c62828',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    elevation: 1,
  },
  errorText: {
    flex: 1,
    color: '#c62828',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  modernCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    elevation: 3,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  modernInput: {
    backgroundColor: '#ffffff',
    fontSize: 14,
    borderRadius: 10,
  },
  modernBtn: {
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 2,
    marginTop: 4,
  },
  modernBtnLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.4,
    paddingVertical: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },
  sectionHeaderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    marginLeft: 0,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
