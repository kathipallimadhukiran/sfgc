import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, View, ActivityIndicator, LogBox } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import AppTabs from '@/components/app-tabs';
import { AppProvider, useApp } from '@/context/AppContext';
import AuthScreen from './auth';

// Suppress non-critical deprecation warnings in logs
LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  'Expo AV has been deprecated',
]);

/**
 * AuthGate — renders the Sign In / Register screen when no user is logged in,
 * and renders the full tab navigation when authenticated.
 */
function AuthGate() {
  const { user, loading } = useApp();

  if (loading) {
    // Show a centered spinner while persisted auth state is being restored
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) {
    // Not signed in — show only the dedicated auth page, no tab bar
    return <AuthScreen />;
  }

  // Signed in — show full tab navigation
  return <AppTabs />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <AppProvider>
      <PaperProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate />
        </ThemeProvider>
      </PaperProvider>
    </AppProvider>
  );
}
