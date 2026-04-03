/**
 * Push Notification Utility
 *
 * Sends push notifications via APNS (Apple) and FCM (Firebase).
 * Currently uses placeholder/console logging. Replace with real
 * APNS/FCM implementations when credentials are configured.
 *
 * IMPORTANT: This is non-blocking — it never throws or fails the parent operation.
 */

const logger = {
  log: (msg: string, ...args: any[]) => console.log(`[PushNotification] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[PushNotification] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[PushNotification] ${msg}`, ...args),
};

interface PushTokens {
  apns?: string;
  fcm?: string;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

async function sendApns(token: string, payload: PushPayload): Promise<void> {
  // Placeholder: In production, use the `apn` package or HTTP/2 APNS API
  // Example with apn:
  //   const apn = require('apn');
  //   const provider = new apn.Provider({ token: { key, keyId, teamId }, production: true });
  //   const notification = new apn.Notification();
  //   notification.alert = { title: payload.title, body: payload.body };
  //   notification.payload = payload.data || {};
  //   notification.topic = 'com.ayphen.hms';
  //   await provider.send(notification, token);
  logger.log(`APNS push (placeholder) -> token=${token.slice(0, 12)}... title="${payload.title}"`);
}

async function sendFcm(token: string, payload: PushPayload): Promise<void> {
  // Placeholder: In production, use Firebase Admin SDK or FCM HTTP v1 API
  // Example with HTTP API:
  //   const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
  //   await fetch('https://fcm.googleapis.com/fcm/send', {
  //     method: 'POST',
  //     headers: { Authorization: `key=${FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       to: token,
  //       notification: { title: payload.title, body: payload.body },
  //       data: payload.data || {},
  //     }),
  //   });
  logger.log(`FCM push (placeholder) -> token=${token.slice(0, 12)}... title="${payload.title}"`);
}

/**
 * Send a push notification to a user's devices.
 * Non-blocking — catches all errors internally so the caller is never affected.
 */
export async function sendPushNotification(
  tokens: PushTokens,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    const payload: PushPayload = { title, body, data };
    const promises: Promise<void>[] = [];

    if (tokens.apns) {
      promises.push(sendApns(tokens.apns, payload));
    }
    if (tokens.fcm) {
      promises.push(sendFcm(tokens.fcm, payload));
    }

    if (promises.length === 0) {
      return; // No tokens to send to
    }

    await Promise.allSettled(promises);
  } catch (err) {
    logger.error('Unexpected error in sendPushNotification', err);
  }
}

/**
 * Send push notification to multiple token sets (e.g., a user may have both APNS and FCM tokens).
 * Non-blocking.
 */
export async function sendPushNotificationToMany(
  tokenSets: PushTokens[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    const promises = tokenSets.map((tokens) => sendPushNotification(tokens, title, body, data));
    await Promise.allSettled(promises);
  } catch (err) {
    logger.error('Unexpected error in sendPushNotificationToMany', err);
  }
}
