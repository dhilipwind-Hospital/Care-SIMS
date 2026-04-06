import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import OfflineIndicator from './src/components/OfflineIndicator';
import { useNotifications } from './src/hooks/useNotifications';

// Keep the splash screen visible while we initialize
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

/**
 * Mounted inside NavigationContainer so useNavigation() is available.
 * Wires up notification tap handlers and renders the navigator + UI overlays.
 */
function NavigatorRoot() {
  useNotifications();
  return (
    <>
      <AppNavigator />
      <OfflineIndicator />
      <StatusBar style="dark" />
    </>
  );
}

function AppShell() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <NavigatorRoot />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
