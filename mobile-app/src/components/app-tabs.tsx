import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme, View, TouchableOpacity, Text } from 'react-native';
import { Avatar, Badge } from 'react-native-paper';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function AppTabs() {
  const { user, notices, language, themeMode } = useApp();
  const router = useRouter();
  
  const activeColor = '#6366f1';
  const isDark = themeMode === 'dark';
  const inactiveColor = isDark ? '#71717a' : '#94a3b8';
  
  const todayNoticeCount = (notices || []).filter((notice) => {
    const dStr = notice.date || notice.createdAt;
    if (!dStr) return true;
    const d = new Date(dStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;

  const profileAvatarHeaderLeft = () => (
    <TouchableOpacity
      style={{ marginLeft: 16 }}
      onPress={() => router.push('/profile')}
    >
      <Avatar.Text
        size={34}
        label={user && user.name ? user.name.substring(0, 2).toUpperCase() : 'SFGC'}
        style={{ backgroundColor: isDark ? '#1e1b4b' : '#e0e7ff' }}
        labelStyle={{ color: '#6366f1', fontSize: 13, fontWeight: 'bold' }}
      />
    </TouchableOpacity>
  );

  // Global header styling
  const headerOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: isDark ? '#09090b' : '#ffffff',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1e1b4b' : '#e2e8f0',
    },
    headerTitleStyle: {
      fontWeight: 'bold' as const,
      fontSize: 18,
      color: isDark ? '#ffffff' : '#0f172a',
    },
    headerRight: () => (
      <TouchableOpacity
        style={{ marginRight: 16 }}
        onPress={() => router.push('/notifications')}
      >
        <View style={{ padding: 4 }}>
          <MaterialCommunityIcons
            name="bell"
            size={24}
            color={isDark ? '#ffffff' : '#475569'}
          />
          {todayNoticeCount > 0 && (
            <Badge
              size={16}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: '#ec4899',
                color: '#fff',
                fontSize: 10,
                fontWeight: 'bold',
              }}
            >
              {todayNoticeCount}
            </Badge>
          )}
        </View>
      </TouchableOpacity>
    ),
  };

  const backArrowHeaderLeft = () => (
    <TouchableOpacity
      style={{ marginLeft: 16, padding: 4 }}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name="arrow-left"
        size={24}
        color={isDark ? '#ffffff' : '#0f172a'}
      />
    </TouchableOpacity>
  );

  return (
    <Tabs 
      initialRouteName="index"
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          height: 72,
          paddingBottom: 12,
          paddingTop: 6,
          backgroundColor: isDark ? '#09090b' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1e1b4b' : '#e2e8f0',
        },
        ...headerOptions,
      }}
    >
      {/* Bible Tab Screen */}
      <Tabs.Screen
        name="bible"
        options={{
          title: language === 'Telugu' ? 'బైబిల్' : 'Bible',
          headerTitle: language === 'Telugu' ? 'పరిశుద్ధ గ్రంథము' : 'Holy Bible',
          headerLeft: profileAvatarHeaderLeft,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} />
          ),
        }}
      />

      {/* Events Tab Screen */}
      <Tabs.Screen
        name="events"
        options={{
          title: language === 'Telugu' ? 'కార్యక్రమాలు' : 'Events',
          headerTitle: language === 'Telugu' ? 'క్యాలెండర్ & కార్యక్రమాలు' : 'Calendar & Events',
          headerLeft: profileAvatarHeaderLeft,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }}
      />

      {/* Home Tab Screen */}
      <Tabs.Screen
        name="index"
        options={{
          title: language === 'Telugu' ? 'హోమ్' : 'Home',
          headerTitle: language === 'Telugu' ? 'SFGC - శాటిలైట్ సిటీ ఫుల్ గోస్పెల్ చర్చి' : 'SFGC - Satellite City Full Gospel Church',
          headerLeft: profileAvatarHeaderLeft,
          tabBarIcon: ({ color }) => {
            const isSelected = color === activeColor;
            return (
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                overflow: 'hidden',
                marginTop: -26,
                shadowColor: isSelected ? '#6366f1' : '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isSelected ? 0.35 : 0.1,
                shadowRadius: 5,
                elevation: 5,
              }}>
                <LinearGradient
                  colors={isSelected ? ['#6366f1', '#ec4899'] : (isDark ? ['#27272a', '#27272a'] : ['#94a3b8', '#64748b'])}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="church" color="#ffffff" size={26} />
                </LinearGradient>
              </View>
            );
          },
        }}
      />

      {/* Songs Tab Screen */}
      <Tabs.Screen
        name="songs"
        options={{
          title: language === 'Telugu' ? 'పాటలు' : 'Songs',
          headerTitle: language === 'Telugu' ? 'ఆరాధన కీర్తనలు' : 'Worship Lyrics',
          headerLeft: profileAvatarHeaderLeft,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="music-note" color={color} size={size} />
          ),
        }}
      />

      {/* YouTube Videos Tab Screen */}
      <Tabs.Screen
        name="live-stream"
        options={{
          title: language === 'Telugu' ? 'యూట్యూబ్ వీడియోలు' : 'YouTube Videos',
          headerLeft: profileAvatarHeaderLeft,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="youtube" color={color} size={size} />
          ),
        }}
      />

      {/* Hidden Screens: Dedicated Sign In & Register */}
      <Tabs.Screen
        name="auth"
        options={{
          title: language === 'Telugu' ? 'లాగిన్ / నమోదు' : 'Sign In / Register',
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      {/* Hidden Screens: Profile with explicit Back Arrow */}
      <Tabs.Screen
        name="profile"
        options={{
          title: language === 'Telugu' ? 'నా ప్రొఫైల్' : 'My Profile',
          href: null, // Hides from tab bar
          tabBarStyle: { display: 'none' }, // Hides bottom bar on this screen
          headerLeft: backArrowHeaderLeft,
          headerRight: undefined,
        }}
      />

      {/* Hidden Screens: Notifications with explicit Back Arrow */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: language === 'Telugu' ? 'ప్రకటనలు & హెచ్చరికలు' : 'Notices & Alerts',
          href: null,
          tabBarStyle: { display: 'none' },
          headerLeft: backArrowHeaderLeft,
          headerRight: undefined,
        }}
      />

      {/* Hidden Screens: Live Lyrics Fullscreen Projection */}
      <Tabs.Screen
        name="live-lyrics"
        options={{
          title: 'Live Worship Screen',
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      {/* Hidden Screens: Song details */}
      <Tabs.Screen
        name="song/[id]"
        options={{
          title: 'Song Details',
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      {/* Hidden Screens: Live Operator Console */}
      <Tabs.Screen
        name="live-operator"
        options={{
          title: 'Live Operator Console',
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
