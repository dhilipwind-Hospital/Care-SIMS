import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import OfflineIndicator from './src/components/OfflineIndicator';
import { startOfflineSync } from './src/lib/offlineSync';

export default function App() {
  useEffect(() => {
    // Start background offline sync monitor
    const unsubscribe = startOfflineSync((syncedCount) => {
      if (syncedCount > 0) {
        Toast.show({
          type: 'success',
          text1: `${syncedCount} offline change${syncedCount !== 1 ? 's' : ''} synced`,
        });
      }
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <OfflineIndicator />
          <StatusBar style="dark" />
        </NavigationContainer>
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
