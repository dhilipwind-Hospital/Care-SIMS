import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PUSH_TOKEN_KEY = 'hms_push_token';

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function storePushToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export async function clearStoredPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Request permissions and obtain an Expo push token.
 * Returns null when running in Expo Go, simulator, or when permission is denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] Push notifications require a physical device');
    return null;
  }

  // Detect Expo Go — push notifications via FCM/APNs are not supported there in SDK 53+
  const appOwnership = (Constants as any).appOwnership;
  if (appOwnership === 'expo') {
    console.warn(
      '[push] Running in Expo Go — remote push notifications are not supported. Use a development build.',
    );
    return null;
  }

  try {
    // Android: ensure notification channel exists
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0F766E',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[push] Permission not granted');
      return null;
    }

    // Resolve projectId from expo config
    const projectId =
      (Constants as any)?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId ??
      (Constants as any)?.expoConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenData.data;

    if (token) {
      await storePushToken(token);
    }
    return token;
  } catch (e) {
    console.error('[push] Failed to register for push notifications:', e);
    return null;
  }
}

/**
 * Add notification listeners (kept for backwards compatibility).
 * Prefer the useNotifications hook for navigation-aware handling.
 */
export function addNotificationListeners(
  onReceived: (notification: Notifications.Notification) => void,
  onTapped: (response: Notifications.NotificationResponse) => void,
) {
  const receivedSub = Notifications.addNotificationReceivedListener(onReceived);
  const responseSub = Notifications.addNotificationResponseReceivedListener(onTapped);
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
