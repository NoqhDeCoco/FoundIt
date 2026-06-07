import { useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserSettingsProvider, useUserSettings } from '@/context/UserSettingsContext';
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';

function ThemedApp() {
  const { user, loading } = useAuth();
  const { effectiveTheme } = useUserSettings();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={effectiveTheme === 'dark' ? DarkTheme : DefaultTheme}>
      {!user ? (
        showRegister
          ? <RegisterScreen onGoToLogin={() => setShowRegister(false)} />
          : <LoginScreen onGoToRegister={() => setShowRegister(true)} />
      ) : (
        <>
          <AnimatedSplashOverlay />
          <AppTabs />
        </>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <ThemedApp />
      </UserSettingsProvider>
    </AuthProvider>
  );
}
