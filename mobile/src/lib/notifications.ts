import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

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

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id',
  });
  const token = tokenData.data;

  // Register token with backend
  try {
    await api.post('/auth/device-token', {
      deviceToken: token,
      deviceType: Platform.OS,
    });
  } catch (e) {
    console.error('Failed to register device token:', e);
  }

  return token;
}

export async function unregisterPushNotifications(token: string) {
  try {
    await api.delete('/auth/device-token', { data: { deviceToken: token } });
  } catch (e) {
    console.error('Failed to unregister device token:', e);
  }
}

// Add notification listeners
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
