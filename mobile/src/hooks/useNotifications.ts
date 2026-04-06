import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

/**
 * Wires up foreground/tap listeners for push notifications and navigates to
 * the screen referenced in the notification payload (`data.screen`).
 *
 * Mount this hook from a component rendered *inside* the NavigationContainer
 * so `useNavigation()` is available.
 */
export function useNotifications() {
  const navigation = useNavigation<any>();
  const receivedSubRef = useRef<Notifications.Subscription | null>(null);
  const responseSubRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Foreground notifications
    receivedSubRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title;
        const body = notification.request.content.body;
        console.log('[push] Received foreground notification:', title, body);
      },
    );

    // Notification taps (works for cold-start, background, foreground)
    responseSubRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { screen?: string; params?: Record<string, unknown> }
          | undefined;
        if (!data?.screen) return;

        try {
          if (data.params) {
            navigation.navigate(data.screen as never, data.params as never);
          } else {
            navigation.navigate(data.screen as never);
          }
        } catch (e) {
          console.warn('[push] Failed to navigate from notification tap:', e);
        }
      },
    );

    // Handle the case where the app was launched from a notification (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        | { screen?: string; params?: Record<string, unknown> }
        | undefined;
      if (!data?.screen) return;
      try {
        if (data.params) {
          navigation.navigate(data.screen as never, data.params as never);
        } else {
          navigation.navigate(data.screen as never);
        }
      } catch {
        /* navigator may not be ready yet */
      }
    });

    return () => {
      receivedSubRef.current?.remove();
      responseSubRef.current?.remove();
      receivedSubRef.current = null;
      responseSubRef.current = null;
    };
  }, [navigation]);
}

export default useNotifications;
